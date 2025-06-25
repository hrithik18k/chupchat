import React from 'react'
import { signInWithGoogle } from '../firebase'

const Login = ({ setUser }) => {
    return (
        <div className="login-container">
            <div className="glass-card">
                <h1>ChupChat 🔐</h1>
                <p style={{ 
                    color: 'var(--text-secondary)', 
                    fontSize: '1.2rem', 
                    marginBottom: '2rem',
                    fontWeight: '300'
                }}>
                    Secure, encrypted messaging for everyone
                </p>
                
                <button 
                    className="btn"
                    onClick={() => signInWithGoogle().then(res => {
                        setUser({
                            name: res.user.displayName || 'Google User',
                            email: res.user.email,
                            photoURL: res.user.photoURL
                        })
                    })}
                >
                    🚀 Sign In with Google
                </button>
                
                <br />
                
                <button 
                    className="btn btn-secondary"
                    onClick={() => setUser({ name: 'Guest' + Math.floor(Math.random() * 1000) })}
                >
                    👤 Continue as Guest
                </button>
            </div>
        </div>
    )
}

export default Login