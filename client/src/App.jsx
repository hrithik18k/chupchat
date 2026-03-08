import React, { useState, useEffect } from 'react'
import Login from './components/login.jsx'
import ChatRoom from './components/ChatRoom.jsx'
import './App.css'

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chupchat-theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chupchat-theme', theme);
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
          color: 'var(--text-muted)',
          marginTop: '1rem',
          fontSize: '1.1rem'
        }}>
          Loading ChupChat...
        </p>
      </div>
    )
  }

  return (
    <div>
      {!user ? (
        <Login setUser={setUser} theme={theme} toggleTheme={toggleTheme} />
      ) : (
        <ChatRoom user={user} clearUser={clearUser} theme={theme} toggleTheme={toggleTheme} />
      )}
    </div>
  )
}

export default App