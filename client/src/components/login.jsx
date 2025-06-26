import React, { useState } from 'react' 
import { signInWithGoogle } from '../firebase'

const Login = ({ setUser }) => {
    const [isSigningIn, setIsSigningIn] = useState(false) 

    const handleGoogleSignIn = () => {
        setIsSigningIn(true) 
        signInWithGoogle()
            .then(res => {
                setUser({
                    name: res.user.displayName || 'Google User',
                    email: res.user.email,
                    photoURL: res.user.photoURL
                })
            })
            .catch(error => {
                console.error("Google Sign-in Error:", error)
                setIsSigningIn(false)
            })
    }

    const handleGuestSignIn = () => {
        const guestId = Math.floor(1000 + Math.random() * 9000); 
        setUser({ name: 'Guest' + guestId, photoURL: '' }); 
    }

    return (
        <div className="login-container">
            <div className="glass-card">
                <h1 className="animate-fade-in-down">ChupChat 🔐</h1>
                <p 
                    style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '1.2rem', 
                        marginBottom: '2rem',
                        fontWeight: '300'
                    }}
                    className="animate-fade-in"
                >
                    Secure, encrypted messaging for everyone
                </p>
                
                <button 
                    className="btn"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn} 
                >
                    {isSigningIn ? (
                        <>
                            <span className="loading-spinner"></span> Signing In...
                        </>
                    ) : (
                        '🚀 Sign In with Google'
                    )}
                </button>
                
                <br />
                
                <button 
                    className="btn btn-secondary"
                    onClick={handleGuestSignIn}
                >
                    👤 Continue as Guest
                </button>
            </div>
        </div>
    )
}

export default Login