import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import CryptoJS from 'crypto-js'

const socket = io('http://localhost:5000')
const secretKey = import.meta.env.VITE_SECRET_KEY

const ChatRoom = ({ user }) => {
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
                message: CryptoJS.AES.decrypt(m.encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8)
            }))
            setMessages(decrypted)
            setJoined(true)
            setError('')
            setTimeout(() => scrollToBottom(), 100)
        })
        socket.on('room-error', msg => setError(msg))
        socket.on('user-joined', setUsers)
        socket.on('receive-message', ({ encryptedMessage, sender }) => {
            setMessages(prev => [
                ...prev,
                {
                    sender,
                    message: CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8)
                }
            ])
        })
        socket.on('user-typing', setTyping)
        socket.on('user-stopped-typing', () => setTyping(''))

        return () => {
            socket.off('room-created')
            socket.off('room-joined')
            socket.off('room-error')
            socket.off('user-joined')
            socket.off('receive-message')
            socket.off('user-typing')
            socket.off('user-stopped-typing')
        }
    }, [roomCode])
    
    useEffect(() => {
        if (isAtBottom && messages.length > 0) {
            scrollToBottom()
        }
    }, [messages, isAtBottom])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleScroll = () => {
        const container = messagesContainerRef.current
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50
            setIsAtBottom(isNearBottom)
        }
    }

    const createRoom = () => {
        if (!roomCode || !password) {
            setError('Room code and password required')
            return
        }
        socket.emit('create-room', { roomCode, user, password })
    }

    const joinRoom = () => {
        if (!roomCode || !password) {
            setError('Room code and password required')
            return
        }
        socket.emit('join-room', { roomCode, user, password })
    }

    const sendMessage = () => {
        if (!message) return
        const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString()
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name })
        setMessage('')
        setIsAtBottom(true)
    }

    const handleTyping = (e) => {
        setMessage(e.target.value)
        socket.emit('typing', { roomCode, user })
    }

    const handleStopTyping = () => {
        socket.emit('stop-typing', { roomCode })
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            sendMessage()
        }
    }

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
                                onClick={() => setMode('create')}
                            >
                                Create Room
                            </button>
                            
                            <button 
                                className={`btn ${mode === 'join' ? 'btn-success' : 'btn-secondary'}`}
                                onClick={() => setMode('join')}
                            >
                                🚪 Join Room
                            </button>
                        </div>
                        
                        {mode && (
                            <div className="room-form">
                                <input
                                    className="input"
                                    placeholder=" Enter Room Code"
                                    value={roomCode}
                                    onChange={e => setRoomCode(e.target.value)}
                                />
                                <input
                                    className="input"
                                    placeholder="🔒 Enter Password"
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
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
                    </div>
                </div>
            ) : (
                <div className="chat-container">
                    <div className="glass-card">
                        <div className="room-header">
                            <h3>🏠 Room: {roomCode}</h3>
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
                                <div style={{ 
                                    textAlign: 'center', 
                                    color: 'var(--text-secondary)',
                                    fontSize: '1.1rem',
                                    padding: '2rem'
                                }}>
                                    💬 No messages yet. Start the conversation!
                                </div>
                            ) : (
                                <>
                                    {messages.map((m, i) => (
                                        <div key={i} className="message">
                                            <b>{m.sender}:</b> {m.message}
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
                                    setIsAtBottom(true)
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
                </div>
            )}
        </div>
    )
}

export default ChatRoom