import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import CryptoJS from 'crypto-js'
import QRCode from 'react-qr-code'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const socket = io('https://chupchat.onrender.com')
const secretKey = import.meta.env.VITE_SECRET_KEY

const ChatRoom = ({ user, clearUser }) => {
    const [roomCode, setRoomCode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') || '';
    });
    const [password, setPassword] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('pwd') || '';
    });
    const hasUrlPassword = new URLSearchParams(window.location.search).has('pwd');
    const [joined, setJoined] = useState(false);
    const [mode, setMode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') ? 'join' : 'join';
    });
    const [error, setError] = useState('')
    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState('')
    const [typing, setTyping] = useState('')
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const typingTimeoutRef = useRef(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const rCode = params.get('room');
        const pwd = params.get('pwd');
        if (rCode && pwd) {
            socket.emit('join-room', { roomCode: rCode, user, password: pwd });
        }

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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
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
            setMode('join')
            setTyping('')
        }
    }

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!joined) {
        return (
            <div className="room-selection-container">
                <div className="room-card">
                    <h2>Secure Rooms</h2>
                    <p>End-to-end encrypted communication.</p>

                    <div className="tab-buttons">
                        <button
                            className={`tab-btn ${mode === 'join' ? 'active' : ''}`}
                            onClick={() => { setMode('join'); setError(''); }}
                        >
                            Join Room
                        </button>
                        <button
                            className={`tab-btn ${mode === 'create' ? 'active' : ''}`}
                            onClick={() => { setMode('create'); setError(''); }}
                        >
                            Create Room
                        </button>
                    </div>

                    <div className="form-group">
                        <input
                            className="input"
                            placeholder="Room Code (4-8 chars/digits)"
                            value={roomCode}
                            onChange={e => setRoomCode(e.target.value)}
                            maxLength={8}
                        />
                    </div>
                    <div className="form-group" style={{ display: hasUrlPassword && mode === 'join' ? 'none' : 'block' }}>
                        <input
                            className="input"
                            placeholder="Passcode (4 digits)"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            maxLength={4}
                        />
                    </div>

                    {error && <div className="error-msg">{error}</div>}

                    <button
                        className="btn btn-primary"
                        onClick={mode === 'create' ? createRoom : joinRoom}
                    >
                        {mode === 'create' ? 'Create' : 'Join'}
                    </button>

                    <div className="divider">Or</div>

                    <button className="btn btn-outline" onClick={clearUser}>
                        Sign Out
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="app-layout">
            <div className={`sidebar-overlay ${mobileSidebarOpen ? 'mobile-open' : ''}`} onClick={() => setMobileSidebarOpen(false)}></div>
            <div className={`sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <h2>Terminal ID: {roomCode}</h2>
                    <button className="close-sidebar-btn" onClick={() => setMobileSidebarOpen(false)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="sidebar-content">
                    <div className="info-section">
                        <h3>Room Invite</h3>
                        <div className="room-code-display">
                            <span>{roomCode}</span>
                            <button className="icon-btn" onClick={() => navigator.clipboard.writeText(roomCode)} title="Copy Room Code">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                        <div className="qr-code-wrapper">
                            <QRCode
                                value={`${window.location.origin}/?room=${roomCode}&pwd=${password}`}
                                size={140}
                                level="M"
                            />
                        </div>
                    </div>

                    <div className="info-section">
                        <h3>Active Participants ({users.length})</h3>
                        <div className="users-list-wrapper">
                            {users.map((u, i) => (
                                <div key={i} className="user-item">
                                    <div className="user-avatar">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '0.95rem' }}>{u.name} {u.name === user.name && '(You)'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }} onClick={handleReturnHome}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Leave Room
                    </button>
                </div>
            </div>

            <div className="chat-main">
                <div className="chat-header">
                    <div className="chat-header-left">
                        <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                        <div className="chat-title">
                            <h2>Project Channel</h2>
                            <span>Fully Encrypted</span>
                        </div>
                    </div>
                    <div className="user-avatar" style={{ width: '32px', height: '32px' }}>
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Avatar" />
                        ) : (
                            user.name.charAt(0).toUpperCase()
                        )}
                    </div>
                </div>

                <div
                    className="chat-messages"
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                >
                    {messages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem', opacity: 0.5 }}>
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                            <p>No messages yet.</p>
                            <p style={{ fontSize: '0.8rem' }}>Messages are E2E encrypted.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((m, i) => {
                                if (m.sender === 'System') {
                                    return <div key={i} className="system-message">{m.message}</div>
                                }

                                const isSelf = m.sender === user.name;
                                return (
                                    <div key={i} className={`message-wrapper ${isSelf ? 'sent' : 'received'}`}>
                                        {!isSelf && <div className="message-sender">{m.sender}</div>}
                                        <div className="message-bubble">
                                            <div
                                                className="message-content"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.message, { breaks: true })) }}
                                            />
                                        </div>
                                        <div className="message-footer">
                                            <span>{formatTimestamp(m.timestamp)}</span>
                                            {isSelf && (
                                                <span className="message-status">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            {typing && (
                                <div className="typing-wrapper">
                                    <span>{typing} is typing</span>
                                    <div className="dots">
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {!isAtBottom && messages.length > 0 && (
                    <button className="scroll-bottom" onClick={scrollToBottom}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <polyline points="19 12 12 19 5 12"></polyline>
                        </svg>
                    </button>
                )}

                <div className="chat-input-area">
                    <div className="input-pill">
                        <button className="emoji-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                                <line x1="9" y1="9" x2="9.01" y2="9"></line>
                                <line x1="15" y1="9" x2="15.01" y2="9"></line>
                            </svg>
                        </button>
                        <textarea
                            className="chat-input"
                            value={message}
                            onChange={handleTyping}
                            onBlur={handleStopTyping}
                            onKeyDown={handleKeyPress}
                            placeholder="Message"
                            rows={1}
                        />
                    </div>
                    <button
                        className="send-btn"
                        onClick={sendMessage}
                        disabled={!message.trim()}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'translateX(-1px) translateY(1px)' }}>
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatRoom