import { useEffect, useRef } from 'react'

// brand palette
const COLORS_FULL    = ['#5B5FFF', '#ef4444', '#facc15', '#60a5fa', '#a78bfa']
const COLORS_AMBIENT = ['#5B5FFF', '#a78bfa', '#60a5fa']          // softer subset for chat
const COLORS_LIGHT   = ['#6366f1', '#818cf8', '#a5b4fc', '#c4b5fd', '#ddd6fe'] // warm for light mode

function lerp(a, b, t) { return a + (b - a) * t }

function createParticle(canvasW, canvasH, count) {
  const angle  = Math.random() * Math.PI * 2
  const radius = Math.random() * Math.min(canvasW, canvasH) * 0.42
  const cx = canvasW / 2
  const cy = canvasH / 2
  const speedScale = count > 100 ? 1 : 0.45   // ambient particles are slower
  return {
    x:  cx + Math.cos(angle) * radius,
    y:  cy + Math.sin(angle) * radius,
    ox: cx + Math.cos(angle) * radius,
    oy: cy + Math.sin(angle) * radius,
    vx: (Math.random() - 0.5) * 0.4 * speedScale,
    vy: (Math.random() - 0.5) * 0.4 * speedScale,
    size:            Math.random() * 2.8 + 0.8,
    parallaxFactor:  Math.random() * 0.06 + 0.01,
    opacity:         Math.random() * 0.5 + 0.4,
  }
}

/**
 * ParticleCanvas
 *
 * @param {Object}  props
 * @param {string}  props.variant  "full" (default, 140 particles, login)
 *                                 "ambient" (70 particles, slower, for chat bg)
 * @param {string}  props.theme    "dark" | "light" — switches palette
 * @param {Object}  props.style    extra inline styles
 */
const ParticleCanvas = ({ variant = 'full', theme = 'dark', style }) => {
  const canvasRef    = useRef(null)
  const mouse        = useRef({ x: -9999, y: -9999, normX: 0, normY: 0 })
  const particles    = useRef([])
  const animFrameRef = useRef(null)

  useEffect(() => {
    // Ambient variant: skip on low-memory devices
    if (variant === 'ambient') {
      const mem = navigator.deviceMemory      // undefined on Firefox
      if (mem !== undefined && mem < 4) return // skip on < 4 GB RAM
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let width, height

    const PARTICLE_COUNT = variant === 'ambient' ? 70 : 140
    const palette =
      theme === 'light'
        ? COLORS_LIGHT
        : variant === 'ambient'
        ? COLORS_AMBIENT
        : COLORS_FULL

    const resize = () => {
      width  = canvas.width  = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
      particles.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height, PARTICLE_COUNT)
      ).map(p => ({
        ...p,
        color: palette[Math.floor(Math.random() * palette.length)],
      }))
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current.x     = e.clientX - rect.left
      mouse.current.y     = e.clientY - rect.top
      mouse.current.normX = (mouse.current.x / width  - 0.5) * 2
      mouse.current.normY = (mouse.current.y / height - 0.5) * 2
    }

    window.addEventListener('mousemove', onMouseMove)
    resize()
    window.addEventListener('resize', resize)

    // Physics constants — ambient is gentler
    const isAmbient           = variant === 'ambient'
    const MOUSE_ATTRACT_RADIUS = isAmbient ? 80  : 160
    const MOUSE_ATTRACT_STR    = isAmbient ? 0.008 : 0.018
    const REPEL_RADIUS         = isAmbient ? 40  : 60
    const REPEL_STR            = isAmbient ? 0.6 : 1.2
    const DRIFT_RETURN         = isAmbient ? 0.006 : 0.012
    const FRICTION             = isAmbient ? 0.92 : 0.88

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const mx = mouse.current.x
      const my = mouse.current.y
      const nx = mouse.current.normX
      const ny = mouse.current.normY

      const vortexOffsetX = -nx * 40
      const vortexOffsetY = -ny * 24

      for (const p of particles.current) {
        const targetX = p.ox + vortexOffsetX * p.parallaxFactor * 16
        const targetY = p.oy + vortexOffsetY * p.parallaxFactor * 16

        p.vx += (targetX - p.x) * DRIFT_RETURN
        p.vy += (targetY - p.y) * DRIFT_RETURN

        const dx   = mx - p.x
        const dy   = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STR
          p.vx -= (dx / dist) * force
          p.vy -= (dy / dist) * force
        } else if (dist < MOUSE_ATTRACT_RADIUS && dist > 0) {
          const force = (1 - dist / MOUSE_ATTRACT_RADIUS) * MOUSE_ATTRACT_STR
          p.vx += (dx / dist) * force * dist
          p.vy += (dy / dist) * force * dist
        }

        p.vx *= FRICTION
        p.vy *= FRICTION
        p.x  += p.vx
        p.y  += p.vy

        // Glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.8)
        grd.addColorStop(0, p.color)
        grd.addColorStop(1, 'transparent')
        ctx.globalAlpha = p.opacity * (isAmbient ? 0.7 : 1)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Solid core
        ctx.globalAlpha = Math.min(p.opacity + 0.2, 1) * (isAmbient ? 0.6 : 1)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      ctx.globalAlpha  = 1
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', resize)
    }
  }, [variant, theme])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

export default ParticleCanvas
