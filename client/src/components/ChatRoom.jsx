import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import CryptoJS from 'crypto-js'

const socket = io('https://chupchat.onrender.com')
const secretKey = import.meta.env.VITE_SECRET_KEY

const ChatRoom = ({ user, clearUser }) => { 
    const [roomCode, setRoomCode] = useState('')
    const [password, setPassword] = useState('')
    const [joined, setJoined] = useState(false)
    const [mode, setMode] = useState('') 
    const [error, setError] = useState('')
    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState('')
    const [typing, setTyping] = useState('')
    const [isAtBottom, setIsAtBottom] = useState(true)
    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const typingTimeoutRef = useRef(null) 

    useEffect(() => {
        socket.on('room-created', ({ success }) => {
            if (success) {
                setJoined(true)
                setError('')
            }
        })

        socket.on('room-joined', ({ users, pastMessages }) => {
            setUsers(users)
            const decrypted = pastMessages.map(m => ({
                sender: m.sender,
                message: CryptoJS.AES.decrypt(m.encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                timestamp: m.timestamp 
            }))
            setMessages(decrypted)
            setJoined(true)
            setError('')
            setTimeout(() => scrollToBottom(), 100)
        })

        socket.on('room-error', msg => setError(msg))
        
        socket.on('user-joined', (updatedUsers) => {
            setUsers(updatedUsers);
            const newUser = updatedUsers.find(u => !users.some(prevU => prevU.name === u.name));
            if (newUser) {
                setMessages(prev => [...prev, { sender: 'System', message: `${newUser.name} has joined the room.`, timestamp: new Date().toISOString() }]);
            }
        });

        socket.on('user-left', (updatedUsers) => {
            setUsers(updatedUsers);
            setMessages(prev => [...prev, { sender: 'System', message: `A user has left the room.`, timestamp: new Date().toISOString() }]);
        });

        socket.on('receive-message', ({ encryptedMessage, sender, timestamp }) => {
            setMessages(prev => [
                ...prev,
                {
                    sender,
                    message: CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                    timestamp: timestamp || new Date().toISOString()
                }
            ])
            setTyping('') 
        })

        socket.on('user-typing', (typerName) => {
            if (typerName !== user.name) { 
                setTyping(typerName)
            }
        })

        socket.on('user-stopped-typing', () => setTyping(''))

        return () => {
            socket.off('room-created')
            socket.off('room-joined')
            socket.off('room-error')
            socket.off('user-joined')
            socket.off('user-left') 
            socket.off('receive-message')
            socket.off('user-typing')
            socket.off('user-stopped-typing')
        }
    }, [roomCode, user.name, users]) 

    useEffect(() => {
        if (isAtBottom && messages.length > 0) {
            scrollToBottom()
        }
    }, [messages, isAtBottom])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        setIsAtBottom(true);
    }

    const handleScroll = () => {
        const container = messagesContainerRef.current
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50 
            setIsAtBottom(isNearBottom)
        }
    }

    const validateRoomCode = (code) => /^[A-Za-z0-9]{4,8}$/.test(code)
    const validatePassword = (pwd) => /^\d{4}$/.test(pwd)

    const createRoom = () => {
        if (!validateRoomCode(roomCode)) {
            setError('Room code must be 4 to 8 letters or numbers.')
            return
        }
        if (!validatePassword(password)) {
            setError('Password must be a 4-digit number.')
            return
        }
        socket.emit('create-room', { roomCode, user, password })
    }

    const joinRoom = () => {
        if (!validateRoomCode(roomCode)) {
            setError('Room code must be 4 to 8 letters or numbers.')
            return
        }
        if (!validatePassword(password)) {
            setError('Password must be a 4-digit number.')
            return
        }
        socket.emit('join-room', { roomCode, user, password })
    }

    const sendMessage = () => {
        if (!message.trim()) return 
        const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString()
        const timestamp = new Date().toISOString()
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name, timestamp })
        setMessage('')
        setTyping('') 
        socket.emit('stop-typing', { roomCode }); 
        setIsAtBottom(true) 
    }

    const handleTyping = (e) => {
        setMessage(e.target.value)
        if (e.target.value.length > 0) {
            socket.emit('typing', { roomCode, user: user.name })
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', { roomCode })
            }, 3000); 
        } else {
            socket.emit('stop-typing', { roomCode })
        }
    }

    const handleStopTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        socket.emit('stop-typing', { roomCode })
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage()
        }
    }

    const handleReturnHome = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            socket.emit('leave-room', { roomCode, user }); 
            setJoined(false)
            setRoomCode('')
            setPassword('')
            setMessages([])
            setUsers([])
            setError('')
            setMode('')
            setTyping('')
        }
    }

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div>
            {!joined ? (
                <div className="room-selection">
                    <div className="glass-card">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: '0 auto 1.5rem', display: 'block'}}>
                            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#7d3c5d" strokeWidth="2"/>
                            <path d="M3 9h18M9 3v18" stroke="#7d3c5d" strokeWidth="2"/>
                        </svg>
                        
                        <h2>Join the Conversation</h2>
                        <p style={{ 
                            color: 'var(--text-secondary)', 
                            marginBottom: '2rem',
                            fontSize: '1.1rem' 
                        }}>
                            Create a new room or join an existing one
                        </p>
                        
                        <div style={{ marginBottom: '2rem' }}>
                            <button 
                                className={`btn ${mode === 'create' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => { setMode('create'); setError(''); setRoomCode(''); setPassword(''); }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                                Create Room
                            </button>
                            
                            <button 
                                className={`btn ${mode === 'join' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => { setMode('join'); setError(''); setRoomCode(''); setPassword(''); }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Join Room
                            </button>
                        </div>
                        
                        {mode && (
                            <div className="room-form">
                                <input
                                    className="input"
                                    placeholder="Enter Room Code (4-8 chars/digits)"
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value)}
                                    maxLength={8}
                                />
                                <input
                                    className="input"
                                    placeholder="Enter Password (4 digits)"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    maxLength={4}
                                />
                                
                                {mode === 'create' ? (
                                    <button className="btn btn-success" onClick={createRoom}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Create Room
                                    </button>
                                ) : (
                                    <button className="btn btn-success" onClick={joinRoom}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <polyline points="10 17 15 12 10 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            <line x1="15" y1="12" x2="3" y2="12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Join Room
                                    </button>
                                )}
                                
                                {error && <div className="error">{error}</div>}
                            </div>
                        )}
                        <button 
                            className="btn btn-secondary"
                            onClick={clearUser} 
                            style={{ marginTop: '2rem' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                                <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Back to Login
                        </button>
                    </div>
                </div>
            ) : (
                <div className="chat-container">
                    <div className="user-profile">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="User Avatar" />
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="#7d3c5d" strokeWidth="2"/>
                                    <circle cx="12" cy="10" r="3" stroke="#7d3c5d" strokeWidth="2"/>
                                    <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            )}
                            <span>Hello, {user.name}!</span>
                        </div>
                        <button className="logout-btn" onClick={clearUser}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '4px', verticalAlign: 'middle'}}>
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Logout
                        </button>
                    </div>

                    <div className="glass-card">
                        <div className="room-header">
                            <h3>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '8px'}}>
                                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#7d3c5d" strokeWidth="2"/>
                                    <path d="M3 9h18M9 3v18" stroke="#7d3c5d" strokeWidth="2"/>
                                </svg>
                                Room: {roomCode}
                            </h3>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => navigator.clipboard.writeText(roomCode)}
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', margin: '0.5rem auto' }}
                                title="Click to copy room code"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Copy Code
                            </button>
                        </div>
                        
                        <div className="users-list">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '8px'}}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="9" cy="7" r="4" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#7d3c5d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <strong>Online Users:</strong> 
                            <span style={{ color: 'var(--text-secondary)' }}>
                                {users.map(u => u.name).join(', ')}
                            </span>
                        </div>
                        
                        <div 
                            className="messages-container"
                            ref={messagesContainerRef}
                            onScroll={handleScroll}
                        >
                            {messages.length === 0 ? (
                                <div className="empty-chat-placeholder">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                    </svg>
                                    No messages yet. Start the conversation!
                                    <p style={{marginTop: '0.5rem', fontSize: '0.9rem'}}>Your messages are encrypted end-to-end.</p>
                                </div>
                            ) : (
                                <>
                                    {messages.map((m, i) => (
                                        <div key={i} className={`message ${m.sender === user.name ? 'self' : ''}`}>
                                            <b>{m.sender === user.name ? 'You' : m.sender}:</b> {m.message}
                                            <span className="message-timestamp">{formatTimestamp(m.timestamp)}</span>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                            {typing && (
                                <div className="typing-indicator">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{verticalAlign: 'middle', marginRight: '6px'}}>
                                        <circle cx="12" cy="12" r="1" fill="currentColor"/>
                                        <circle cx="6" cy="12" r="1" fill="currentColor"/>
                                        <circle cx="18" cy="12" r="1" fill="currentColor"/>
                                    </svg>
                                    {typing} is typing...
                                </div>
                            )}
                        </div>
                        {!isAtBottom && messages.length > 0 && (
                            <button
                                className="scroll-to-bottom-btn"
                                onClick={() => {
                                    scrollToBottom()
                                }}
                                title="Scroll to bottom"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="6 9 12 15 18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </button>
                        )}
                        
                        <div className="input-group">
                            <input
                                className="input"
                                value={message}
                                onChange={handleTyping}
                                onBlur={handleStopTyping}
                                onKeyPress={handleKeyPress}
                                placeholder="Type your message..."
                            />
                            <button className="btn btn-success" onClick={sendMessage}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '6px', verticalAlign: 'middle'}}>
                                    <line x1="22" y1="2" x2="11" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                Send
                            </button>
                        </div>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ marginTop: '1.5rem', width: '100%' }}
                        onClick={handleReturnHome}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight: '8px', verticalAlign: 'middle'}}>
                            <line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="12 19 5 12 12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Leave Room
                    </button>
                </div>
            )}
        </div>
    )
}

export default ChatRoom