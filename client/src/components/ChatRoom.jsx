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
                    timestamp 
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
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name, timestamp: new Date().toISOString() })
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
                        <h2>🏠 Join the Conversation</h2>
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
                                Create Room
                            </button>
                            
                            <button 
                                className={`btn ${mode === 'join' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => { setMode('join'); setError(''); setRoomCode(''); setPassword(''); }}
                            >
                                🚪 Join Room
                            </button>
                        </div>
                        
                        {mode && (
                            <div className="room-form">
                                <input
                                    className="input"
                                    placeholder=" Enter Room Code (4-8 chars/digits)"
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value)}
                                    maxLength={8}
                                />
                                <input
                                    className="input"
                                    placeholder="🔒 Enter Password (4 digits)"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    maxLength={4}
                                />
                                
                                {mode === 'create' ? (
                                    <button className="btn btn-success" onClick={createRoom}>
                                        ✨ Create Room
                                    </button>
                                ) : (
                                    <button className="btn btn-success" onClick={joinRoom}>
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
                            ⬅️ Back to Login
                        </button>
                    </div>
                </div>
            ) : (
                <div className="chat-container">
                    <div className="user-profile">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {user.photoURL && <img src={user.photoURL} alt="User Avatar" />}
                            <span>Hello, {user.name}!</span>
                        </div>
                        <button className="logout-btn" onClick={clearUser}>Logout</button>
                    </div>

                    <div className="glass-card">
                        <div className="room-header">
                            <h3>🏠 Room: {roomCode}</h3>
                            <button 
                                className="btn btn-secondary btn-sm" 
                                onClick={() => navigator.clipboard.writeText(roomCode)}
                                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', margin: '0.5rem auto' }}
                                title="Click to copy room code"
                            >
                                Copy Code 📋
                            </button>
                        </div>
                        
                        <div className="users-list">
                            <strong>👥 Online Users:</strong> 
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
                                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" class="lucide lucide-message-circle-code"><path d="M7.9 20A9 9 0 0 1 12 10V4a8 8 0 1 0 0 16" /><path d="m17 17 2 2 2-2" /><path d="m13 21-2-2-2 2" /></svg>
                                    💬 No messages yet. Start the conversation!
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
                                    💬 {typing} is typing...
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
                                ⬇️
                            </button>
                        )}
                        
                        <div className="input-group">
                            <input
                                className="input"
                                value={message}
                                onChange={handleTyping}
                                onBlur={handleStopTyping}
                                onKeyPress={handleKeyPress}
                                placeholder="💭 Type your message..."
                            />
                            <button className="btn btn-success" onClick={sendMessage}>
                                🚀 Send
                            </button>
                        </div>
                    </div>
                    <button
                        className="btn btn-secondary"
                        style={{ marginTop: '1.5rem', width: '100%' }}
                        onClick={handleReturnHome}
                    >
                        ⬅️ Leave Room
                    </button>
                </div>
            )}
        </div>
    )
}

export default ChatRoom