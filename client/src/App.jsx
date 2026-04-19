import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import Login from './components/login.jsx'
import ChatRoom from './components/ChatRoom.jsx'
import ParticleCanvas from './components/ParticleCanvas.jsx'
import './App.css'

const App = () => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('onyx-user')
    return savedUser ? JSON.parse(savedUser) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      localStorage.setItem('onyx-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('onyx-user')
    }
  }, [user])

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('onyx-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('onyx-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  const clearUser = () => {
    setUser(null)
  }

  // ── Mouse-follower gradient ──────────────────────────────────────────────
  const gradientLayerRef = useRef(null)
  const rafRef           = useRef(null)
  const targetPos        = useRef({ x: 50, y: 50 })
  const currentPos       = useRef({ x: 50, y: 50 })

  const animateGradient = useCallback(() => {
    const LERP = 0.06
    currentPos.current.x += (targetPos.current.x - currentPos.current.x) * LERP
    currentPos.current.y += (targetPos.current.y - currentPos.current.y) * LERP

    if (gradientLayerRef.current) {
      const x = currentPos.current.x.toFixed(2)
      const y = currentPos.current.y.toFixed(2)

      gradientLayerRef.current.style.background =
        theme === 'dark'
          ? `radial-gradient(ellipse 55% 45% at ${x}% ${y}%, rgba(91,95,255,0.09) 0%, rgba(239,68,68,0.04) 40%, transparent 70%)`
          : `radial-gradient(ellipse 55% 45% at ${x}% ${y}%, rgba(99,102,241,0.07) 0%, rgba(250,204,21,0.035) 45%, transparent 70%)`
    }

    rafRef.current = requestAnimationFrame(animateGradient)
  }, [theme])

  useEffect(() => {
    const onMouseMove = (e) => {
      targetPos.current.x = (e.clientX / window.innerWidth)  * 100
      targetPos.current.y = (e.clientY / window.innerHeight) * 100
    }
    window.addEventListener('mousemove', onMouseMove)
    rafRef.current = requestAnimationFrame(animateGradient)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [animateGradient])
  // ────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div className="loading"></div>
        <p style={{
          color: 'var(--text-secondary)',
          marginTop: '1rem',
          fontSize: '1.1rem'
        }}>
          Loading Onyx...
        </p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Global mouse-follower gradient layer */}
      <div
        ref={gradientLayerRef}
        style={{
          position:      'fixed',
          inset:         0,
          pointerEvents: 'none',
          zIndex:        0,
          transition:    'background 0.15s ease',
        }}
      />

      {/* Login page — full 140-particle vortex */}
      {!user && (
        <ParticleCanvas
          variant="full"
          theme={theme}
          style={{
            position:      'fixed',
            inset:         0,
            zIndex:        0,
            pointerEvents: 'none',
            opacity:       0.75,
          }}
        />
      )}

      {/* Chat page — ambient 70-particle vortex, lower opacity */}
      {user && (
        <div
          className="ambient-canvas-wrapper"
          style={{
            position: 'fixed',
            inset:    0,
            zIndex:   0,
          }}
        >
          <ParticleCanvas
            variant="ambient"
            theme={theme}
            style={{
              position:      'absolute',
              inset:         0,
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      {/* App content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {!user ? (
          <Login setUser={setUser} theme={theme} toggleTheme={toggleTheme} />
        ) : (
          <ChatRoom user={user} clearUser={clearUser} theme={theme} toggleTheme={toggleTheme} />
        )}
      </div>
    </div>
  )
}

export default App

App.propTypes = {
  toggleTheme: PropTypes.func,
  theme: PropTypes.string
}