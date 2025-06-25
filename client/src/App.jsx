import React, { useState, useEffect } from 'react'
import Login from './components/login.jsx'
import ChatRoom from './components/ChatRoom.jsx'
import './App.css'

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

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
          Loading ChupChat...
        </p>
      </div>
    )
  }

  return (
    <div>
      {!user ? (
        <Login setUser={setUser} />
      ) : (
        <ChatRoom user={user} />
      )}
    </div>
  )
}

export default App