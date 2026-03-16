import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 140
const COLORS = [
  '#5B5FFF', // brand violet-blue
  '#ef4444', // red
  '#facc15', // yellow
  '#60a5fa', // light blue
  '#a78bfa', // purple
]

function lerp(a, b, t) {
  return a + (b - a) * t
}

function createParticle(canvasW, canvasH) {
  const angle = Math.random() * Math.PI * 2
  const radius = Math.random() * Math.min(canvasW, canvasH) * 0.38
  const cx = canvasW / 2
  const cy = canvasH / 2
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
    ox: cx + Math.cos(angle) * radius, // origin x
    oy: cy + Math.sin(angle) * radius, // origin y
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    size: Math.random() * 2.8 + 0.8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    parallaxFactor: (Math.random() * 0.06 + 0.01), // subtle depth
    opacity: Math.random() * 0.5 + 0.4,
  }
}

const ParticleCanvas = ({ style }) => {
  const canvasRef = useRef(null)
  const mouse = useRef({ x: -9999, y: -9999, normX: 0, normY: 0 })
  const particles = useRef([])
  const animFrameRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let width, height

    const resize = () => {
      width = canvas.width = canvas.offsetWidth
      height = canvas.height = canvas.offsetHeight
      particles.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(width, height)
      )
    }

    const onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current.x = e.clientX - rect.left
      mouse.current.y = e.clientY - rect.top
      mouse.current.normX = (mouse.current.x / width - 0.5) * 2  // -1 to 1
      mouse.current.normY = (mouse.current.y / height - 0.5) * 2 // -1 to 1
    }

    window.addEventListener('mousemove', onMouseMove)

    resize()
    window.addEventListener('resize', resize)

    const MOUSE_ATTRACT_RADIUS = 160
    const MOUSE_ATTRACT_STRENGTH = 0.018
    const REPEL_RADIUS = 60
    const REPEL_STRENGTH = 1.2
    const DRIFT_RETURN = 0.012  // how fast particles return to orbit
    const FRICTION = 0.88

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const mx = mouse.current.x
      const my = mouse.current.y
      const nx = mouse.current.normX
      const ny = mouse.current.normY

      // Parallax vortex center offset
      const vortexOffsetX = -nx * 40
      const vortexOffsetY = -ny * 24

      for (const p of particles.current) {
        // Target origin with parallax shift baked in
        const targetX = p.ox + vortexOffsetX * p.parallaxFactor * 16
        const targetY = p.oy + vortexOffsetY * p.parallaxFactor * 16

        // Drift gently back toward shifted origin
        p.vx += (targetX - p.x) * DRIFT_RETURN
        p.vy += (targetY - p.y) * DRIFT_RETURN

        // Mouse interaction
        const dx = mx - p.x
        const dy = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < REPEL_RADIUS && dist > 0) {
          // Repel when cursor is very close
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH
          p.vx -= (dx / dist) * force
          p.vy -= (dy / dist) * force
        } else if (dist < MOUSE_ATTRACT_RADIUS && dist > 0) {
          // Attract when cursor is in range
          const force = (1 - dist / MOUSE_ATTRACT_RADIUS) * MOUSE_ATTRACT_STRENGTH
          p.vx += (dx / dist) * force * dist
          p.vy += (dy / dist) * force * dist
        }

        p.vx *= FRICTION
        p.vy *= FRICTION

        p.x += p.vx
        p.y += p.vy

        // Draw glow
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.8)
        grd.addColorStop(0, p.color)
        grd.addColorStop(1, 'transparent')
        ctx.globalAlpha = p.opacity
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 2.8, 0, Math.PI * 2)
        ctx.fillStyle = grd
        ctx.fill()

        // Solid core dot
        ctx.globalAlpha = Math.min(p.opacity + 0.2, 1)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }

      ctx.globalAlpha = 1
      animFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

export default ParticleCanvas
