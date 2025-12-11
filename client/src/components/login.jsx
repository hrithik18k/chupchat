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
            <div className="glass-card login-wrapper">
                {/* Left side - Illustration */}
                <div className="login-left">
                    <img 
                        src="/skeleton-illustration.png" 
                        alt="ChupChat Illustration" 
                        className="login-illustration"
                    />
                    
                    <h1>ChupChat</h1>
                    <p className="login-subtitle">
                        Secure Real-Time Encrypted Chat Rooms
                    </p>
                </div>
                
                {/* Right side - Login form */}
                <div className="login-right">
                    {/* Icon */}
                    <div className="login-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    
                    <h2>Login to your Account</h2>
                    
                    <button 
                        className="btn btn-google"
                        onClick={handleGoogleSignIn}
                        disabled={isSigningIn} 
                    >
                        {isSigningIn ? (
                            <>
                                <span className="loading-spinner"></span> Signing In...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </>
                        )}
                    </button>
                    
                    <div className="login-divider">or</div>
                    
                    <button 
                        className="btn btn-secondary"
                        onClick={handleGuestSignIn}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Continue as guest
                    </button>
                    
                    <button 
                        className="btn"
                        onClick={() => {/* Add your login logic */}}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px'}}>
                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="10 17 15 12 10 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Login
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login