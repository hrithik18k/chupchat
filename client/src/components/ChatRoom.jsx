import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import CryptoJS from 'crypto-js'
import QRCode from 'react-qr-code'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { parseCipherCommand, invokeCipher } from '../utils/cipher.js'

const socket = io(import.meta.env.DEV ? 'http://localhost:5000' : 'https://chupchat.onrender.com')
const secretKey = import.meta.env.VITE_SECRET_KEY

const ChatRoom = ({ user, clearUser, theme, toggleTheme }) => {
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
    const [typingUsers, setTypingUsers] = useState([])
    const [openReceiptId, setOpenReceiptId] = useState(null)
    const [roomType, setRoomType] = useState('normal')
    const [currentRoomType, setCurrentRoomType] = useState('normal')
    const [showGhostToast, setShowGhostToast] = useState(false)
    const [isAtBottom, setIsAtBottom] = useState(true)
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editText, setEditText] = useState('')
    const [openContextMenuId, setOpenContextMenuId] = useState(null)
    const [cipherThinking, setCipherThinking] = useState(false)
    const [cipherHintVisible, setCipherHintVisible] = useState(false)
    const [roomCreatorName, setRoomCreatorName] = useState('')
    const [deleteRequestPending, setDeleteRequestPending] = useState(false)
    const [incomingDeleteRequest, setIncomingDeleteRequest] = useState(null) // { requesterName }
    const [showRoomDeletedToast, setShowRoomDeletedToast] = useState('')
    const [couplesTheme, setCouplesTheme] = useState(false)
    const [recentRooms, setRecentRooms] = useState(() => {
        const saved = localStorage.getItem(`onyx-recent-rooms-${user?.name || 'guest'}`);
        return saved ? JSON.parse(saved) : [];
    });
    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const longPressTimeoutRef = useRef(null)
    const autoJoinAttempted = useRef(false)
    const sendBtnRef = useRef(null)

    const saveRecentRoom = (code, pwd) => {
        if (!code) return;
        setRecentRooms(prev => {
            const filtered = prev.filter(r => r.roomCode !== code);
            const updated = [{ roomCode: code, password: pwd, timestamp: Date.now() }, ...filtered].slice(0, 3);
            localStorage.setItem(`onyx-recent-rooms-${user?.name || 'guest'}`, JSON.stringify(updated));
            return updated;
        });
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const rCode = params.get('room');
        const pwd = params.get('pwd');
        if (rCode && pwd && !autoJoinAttempted.current) {
            autoJoinAttempted.current = true;
            socket.emit('join-room', { roomCode: rCode, user, password: pwd });
        }

        socket.on('room-created', ({ success, roomType: createdRoomType }) => {
            if (success) {
                setJoined(true)
                setError('')
                if (createdRoomType) setCurrentRoomType(createdRoomType)
                setUsers([{ name: user.name }])
                setRoomCreatorName(user.name) // creator is always the current user
                saveRecentRoom(roomCode, password)
                window.history.pushState({}, '', `/?room=${roomCode}&pwd=${password}`)
            }
        })

        socket.on('room-joined', ({ users, pastMessages, roomType, createdByName }) => {
            setUsers(users)
            setCurrentRoomType(roomType || 'normal');
            setRoomCreatorName(createdByName || '')
            const decrypted = pastMessages.map(m => ({
                _id: m._id,
                sender: m.sender,
                message: CryptoJS.AES.decrypt(m.encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                timestamp: m.timestamp,
                seenBy: m.seenBy || [],
                edited: m.edited || false,
                editedAt: m.editedAt || null
            }))
            setMessages(decrypted)
            setJoined(true)
            setError('')
            saveRecentRoom(roomCode, password)
            window.history.pushState({}, '', `/?room=${roomCode}&pwd=${password}`)
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

        socket.on('receive-message', ({ _id, encryptedMessage, sender, timestamp }) => {
            setMessages(prev => [
                ...prev,
                {
                    _id,
                    sender,
                    message: CryptoJS.AES.decrypt(encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                    timestamp: timestamp || new Date().toISOString(),
                    seenBy: [],
                    edited: false,
                    editedAt: null
                }
            ])
            setTypingUsers(prev => prev.filter(u => u !== sender))
        })

        socket.on('message-deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });

        socket.on('message-edited', ({ messageId, newEncryptedMessage, editedAt }) => {
            setMessages(prev => prev.map(m => {
                if (m._id === messageId) {
                    return {
                        ...m,
                        message: CryptoJS.AES.decrypt(newEncryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                        edited: true,
                        editedAt
                    };
                }
                return m;
            }));
        });

        socket.on('edit-error', ({ error }) => {
            alert(error);
        });

        socket.on('users-typing', (typersArray) => {
            setTypingUsers(typersArray)
        })

        socket.on('seen-update', (updates) => {
            setMessages(prev => prev.map(m => {
                const update = updates.find(u => u._id === m._id)
                return update ? { ...m, seenBy: update.seenBy } : m
            }))
        })

        // Room deleted (by creator or approved request)
        socket.on('room-deleted', ({ message }) => {
            setShowRoomDeletedToast(message)
            setTimeout(() => {
                setShowRoomDeletedToast('')
                window.history.pushState({}, '', '/')
                setJoined(false)
                setRoomCode('')
                setPassword('')
                setMessages([])
                setUsers([])
                setError('')
                setMode('join')
                setRoomCreatorName('')
                setDeleteRequestPending(false)
                setIncomingDeleteRequest(null)
            }, 2500)
        })

        // Incoming delete request — shown to creator
        socket.on('incoming-delete-request', ({ roomCode: rc, requesterName }) => {
            setIncomingDeleteRequest({ requesterName })
        })

        // Delete request was rejected by creator — notify requester
        socket.on('delete-request-rejected', ({ requesterName }) => {
            setDeleteRequestPending(false)
            if (requesterName === user.name) {
                setMessages(prev => [...prev, {
                    sender: 'System',
                    message: '🚫 Your room deletion request was declined by the creator.',
                    timestamp: new Date().toISOString()
                }])
            }
        })

        // Creator offline response
        socket.on('delete-request-result', ({ status, message: msg }) => {
            setDeleteRequestPending(false)
            setMessages(prev => [...prev, {
                sender: 'System',
                message: `⚠️ ${msg}`,
                timestamp: new Date().toISOString()
            }])
        })

        const handleRoomClosed = () => {
            setShowGhostToast(true);
            setTimeout(() => {
                setShowGhostToast(false);
                socket.emit('leave-room', { roomCode, user });
                window.history.pushState({}, '', '/')
                setJoined(false);
                setRoomCode('');
                setPassword('');
                setMessages([]);
                setUsers([]);
                setError('');
                setMode('join');
                setTyping('');
            }, 2000);
        };
        socket.on('room-closed', handleRoomClosed)

        return () => {
            socket.off('room-created')
            socket.off('room-joined')
            socket.off('room-error')
            socket.off('user-joined')
            socket.off('user-left')
            socket.off('receive-message')
            socket.off('message-deleted')
            socket.off('message-edited')
            socket.off('edit-error')
            socket.off('users-typing')
            socket.off('seen-update')
            socket.off('room-closed', handleRoomClosed)
            socket.off('room-deleted')
            socket.off('incoming-delete-request')
            socket.off('delete-request-rejected')
            socket.off('delete-request-result')
        }
    }, [roomCode, password, user.name, users, user])

    useEffect(() => {
        const handleClickOutside = () => {
            setOpenReceiptId(null);
            setOpenContextMenuId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isAtBottom && messages.length > 0) {
            scrollToBottom()
        }
    }, [messages, isAtBottom])

    useEffect(() => {
        if (!joined) return;
        const observer = new IntersectionObserver((entries) => {
            const visibleIds = entries
                .filter(e => e.isIntersecting)
                .map(e => e.target.dataset.messageId)
                .filter(Boolean)
            if (visibleIds.length > 0) {
                socket.emit('mark-seen', { roomCode, messageIds: visibleIds, userName: user.name })
            }
        }, { threshold: 0.5 })

        document.querySelectorAll('.received[data-message-id]').forEach(el => observer.observe(el))

        return () => observer.disconnect()
    }, [messages, joined, roomCode, user.name])

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
        socket.emit('create-room', { roomCode, user, password, roomType })
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

    const sendMessage = async () => {
        if (!message.trim()) return

        // ── Cipher command interception ──
        const cipherCmd = parseCipherCommand(message)
        if (cipherCmd) {
            // Block Cipher in Ghost rooms
            if (currentRoomType === 'ghost') {
                setMessages(prev => [...prev, {
                    sender: 'Cipher',
                    message: '🔒 Cipher is disabled in Ghost rooms to protect maximum privacy.',
                    timestamp: new Date().toISOString(),
                    seenBy: [],
                    edited: false,
                    isCipherLocal: true
                }])
                setMessage('')
                return
            }

            // Show user's @cipher message locally (don't broadcast the command)
            setMessages(prev => [...prev, {
                sender: user.name,
                message: message,
                timestamp: new Date().toISOString(),
                seenBy: [],
                edited: false,
                isCipherLocal: true
            }])
            setMessage('')
            socket.emit('stop-typing', { roomCode, user: user.name })

            // Show thinking state
            setCipherThinking(true)
            setIsAtBottom(true)

            try {
                // Fetch raw encrypted messages for context
                const rawMessages = await fetch(
                    `${import.meta.env.DEV ? 'http://localhost:5000' : 'https://chupchat.onrender.com'}/api/cipher/messages/${roomCode}`
                ).then(r => r.ok ? r.json() : []).catch(() => [])

                const { plainReply } = await invokeCipher({
                    command: cipherCmd.command,
                    args: cipherCmd.args,
                    encryptedMessages: rawMessages.length > 0 ? rawMessages : messages.map(m => ({
                        sender: m.sender,
                        encryptedMessage: CryptoJS.AES.encrypt(m.message, secretKey).toString()
                    })),
                    lastUserMessage: message
                })

                // Add Cipher's reply LOCALLY — only visible to this user
                setMessages(prev => [...prev, {
                    sender: 'Cipher',
                    message: plainReply,
                    timestamp: new Date().toISOString(),
                    seenBy: [],
                    edited: false,
                    isCipherLocal: true
                }])
            } catch (err) {
                console.error('Cipher error:', err)
                setMessages(prev => [...prev, {
                    sender: 'Cipher',
                    message: '⚠️ Something went wrong. Please try again.',
                    timestamp: new Date().toISOString(),
                    seenBy: [],
                    edited: false,
                    isCipherLocal: true
                }])
            } finally {
                setCipherThinking(false)
            }
            return
        }
        // ── End Cipher interception ──

        const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString()
        const timestamp = new Date().toISOString()
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name, timestamp })
        setMessage('')
        socket.emit('stop-typing', { roomCode, user: user.name });
        setIsAtBottom(true)
        // Pop animation on send button
        if (sendBtnRef.current) {
            sendBtnRef.current.classList.remove('pop')
            void sendBtnRef.current.offsetWidth // reflow
            sendBtnRef.current.classList.add('pop')
            sendBtnRef.current.addEventListener('animationend', () => {
                sendBtnRef.current?.classList.remove('pop')
            }, { once: true })
        }
    }

    const handleTyping = (e) => {
        setMessage(e.target.value)

        // Show/hide @cipher hint
        const val = e.target.value.toLowerCase()
        setCipherHintVisible(val.startsWith('@cipher') && val.length <= 8)

        if (e.target.value.length > 0) {
            socket.emit('typing', { roomCode, user: user.name })
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current)
            }
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', { roomCode, user: user.name })
            }, 3000);
        } else {
            socket.emit('stop-typing', { roomCode, user: user.name })
        }
    }

    const handleStopTyping = () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        socket.emit('stop-typing', { roomCode, user: user.name })
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage()
        }
    }

    const handleReturnHomeSilent = () => {
        socket.emit('leave-room', { roomCode, user });
        window.history.pushState({}, '', '/')
        setJoined(false)
        setRoomCode('')
        setPassword('')
        setMessages([])
        setUsers([])
        setError('')
        setMode('join')
        setTyping('')
    }

    const handleReturnHome = () => {
        if (window.confirm('Are you sure you want to leave this room?')) {
            handleReturnHomeSilent();
        }
    }

    // Creator: directly delete the room
    const handleDeleteRoom = () => {
        if (window.confirm('⚠️ This will permanently delete the room and ALL messages for everyone. Continue?')) {
            socket.emit('delete-room', { roomCode, userName: user.name })
        }
    }

    // Non-creator: request that the creator deletes
    const handleRequestDeleteRoom = () => {
        if (deleteRequestPending) return
        setDeleteRequestPending(true)
        socket.emit('request-delete-room', { roomCode, requesterName: user.name })
        setMessages(prev => [...prev, {
            sender: 'System',
            message: '📨 Your deletion request has been sent to the room creator.',
            timestamp: new Date().toISOString()
        }])
    }

    // Creator: approve or reject incoming deletion request
    const handleIncomingDeleteResponse = (approved) => {
        if (approved) {
            socket.emit('approve-delete-room', { roomCode, userName: user.name })
        } else {
            socket.emit('reject-delete-room', { roomCode, requesterName: incomingDeleteRequest?.requesterName })
            setIncomingDeleteRequest(null)
        }
    }

    const handleTouchStart = (e, m) => {
        if (m.sender !== user.name) return;
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = setTimeout(() => {
            setOpenContextMenuId(m._id);
            setOpenReceiptId(null);
        }, 500);
    };

    const handleTouchEnd = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };

    const handleContextMenu = (e, m) => {
        if (m.sender !== user.name) return;
        e.preventDefault();
        e.stopPropagation();
        setOpenContextMenuId(m._id);
        setOpenReceiptId(null);
    };

    const handleDeleteMessage = (messageId) => {
        socket.emit('delete-message', { roomCode, messageId, userName: user.name });
        setOpenContextMenuId(null);
    };

    const handleEditMessageStart = (m) => {
        setEditingMessageId(m._id);
        setEditText(m.message);
        setOpenContextMenuId(null);
    };

    const handleSaveEdit = (m) => {
        if (!editText.trim() || editText === m.message) {
            setEditingMessageId(null);
            return;
        }
        const newEncryptedMessage = CryptoJS.AES.encrypt(editText, secretKey).toString();
        socket.emit('edit-message', { roomCode, messageId: m._id, newEncryptedMessage, userName: user.name });
        setEditingMessageId(null);
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (!joined) {
        return (
            <div className="room-selection-container" style={{ position: 'relative', overflow: 'hidden' }}>

                {/* ── Animated security background ── */}
                <div className="rsbg" aria-hidden="true">
                    {/* Dot-grid */}
                    <div className="rsbg-grid" />

                    {/* Radar rings */}
                    <div className="rsbg-ring rsbg-ring-1" />
                    <div className="rsbg-ring rsbg-ring-2" />
                    <div className="rsbg-ring rsbg-ring-3" />
                    <div className="rsbg-ring rsbg-ring-4" />
                    <div className="rsbg-ring rsbg-ring-5" />

                    {/* Rotating sweep beam */}
                    <div className="rsbg-sweep" />
                    {/* Counter-rotating secondary sweep */}
                    <div className="rsbg-sweep rsbg-sweep-2" />

                    {/* Center glowing dot */}
                    <div className="rsbg-center" />

                    {/* Orbiting satellite dots */}
                    <div className="rsbg-orbit">
                        <div className="rsbg-orbit-dot rsbg-orbit-dot-1" />
                        <div className="rsbg-orbit-dot rsbg-orbit-dot-2" />
                        <div className="rsbg-orbit-dot rsbg-orbit-dot-3" />
                        <div className="rsbg-orbit-dot rsbg-orbit-dot-4" />
                    </div>

                    {/* Matrix binary-rain columns */}
                    {['01101', '10011', '11010', '00101', '10110', '01011', '11001'].map((bin, i) => (
                        <div key={`rain-${i}`} className={`rsbg-rain rsbg-rain-${i + 1}`}>
                            {Array.from({ length: 8 }).map((_, j) => (
                                <span key={j} className={`rsbg-rain-char rsbg-rain-char-${j + 1}`}>
                                    {['01', '10', '11', '00', '1', '0'][Math.floor((i + j) % 6)]}
                                </span>
                            ))}
                        </div>
                    ))}

                    {/* Floating hexagon shapes */}
                    <div className="rsbg-hex rsbg-hex-1" />
                    <div className="rsbg-hex rsbg-hex-2" />
                    <div className="rsbg-hex rsbg-hex-3" />
                    <div className="rsbg-hex rsbg-hex-4" />

                    {/* Data-packet flow lines */}
                    <div className="rsbg-dataline rsbg-dataline-1"><div className="rsbg-packet" /></div>
                    <div className="rsbg-dataline rsbg-dataline-2"><div className="rsbg-packet" /></div>
                    <div className="rsbg-dataline rsbg-dataline-3"><div className="rsbg-packet" /></div>

                    {/* Floating encrypted glyphs */}
                    {['AES-256', '2FA', 'E2E', '🔒', 'RSA', 'SHA-3', '0x9F', '///'].map((g, i) => (
                        <span key={i} className={`rsbg-glyph rsbg-glyph-${i + 1}`}>{g}</span>
                    ))}

                    {/* Corner HUD node markers */}
                    <div className="rsbg-node rsbg-node-tl" />
                    <div className="rsbg-node rsbg-node-tr" />
                    <div className="rsbg-node rsbg-node-bl" />
                    <div className="rsbg-node rsbg-node-br" />

                    {/* Horizontal scan line */}
                    <div className="rsbg-scanline" />
                    {/* Second scan line (offset) */}
                    <div className="rsbg-scanline rsbg-scanline-2" />
                </div>
                {/* ── /Animated security background ── */}

                <button
                    className="theme-toggle-btn"
                    onClick={() => {
                        toggleTheme();
                        const btn = document.querySelector('.theme-toggle-btn');
                        if (btn) {
                            btn.classList.remove('spin');
                            void btn.offsetWidth;
                            btn.classList.add('spin');
                            btn.addEventListener('animationend', () => btn.classList.remove('spin'), { once: true });
                        }
                    }}
                    style={{ position: 'absolute', top: '20px', right: '20px' }}
                    title="Toggle Theme"
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                <div className="room-card room-card-animated">
                    {/* Animated spinning border layer */}
                    <div className="room-card-border-spin" aria-hidden="true" />
                    <div style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative', zIndex: 1 }}>
                        <img src="/onyx-logo.png" alt="Onyx Logo" width="64" height="64" className="room-card-logo" style={{ borderRadius: '14px' }} />
                    </div>
                    <h2 style={{ textAlign: 'center', position: 'relative', zIndex: 1 }} className="room-card-title">Secure Rooms</h2>

                    <p style={{ textAlign: 'center' }}>End-to-end encrypted communication.</p>

                    {recentRooms.length > 0 && (
                        <div className="recent-rooms-section" style={{ marginTop: '1rem', marginBottom: '1.5rem', textAlign: 'left', background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <h4 style={{ margin: '0 0 0.8rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recently Joined</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {recentRooms.map((room, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        background: 'var(--bg-primary)', 
                                        padding: '0.6rem 0.8rem', 
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1rem' }}>💬</span>
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '1px' }}>{room.roomCode}</span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                setRoomCode(room.roomCode);
                                                setPassword(room.password);
                                                socket.emit('join-room', { roomCode: room.roomCode, user, password: room.password });
                                            }}
                                            className="btn btn-primary"
                                            style={{
                                                padding: '0.3rem 0.8rem',
                                                fontSize: '0.8rem',
                                                minHeight: 'auto',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            Rejoin
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    {mode === 'create' && (
                        <div className="room-type-selector" style={{ marginBottom: '1.5rem' }}>
                            <div className="tab-buttons" style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className={`tab-btn ${roomType === 'normal' ? 'active' : ''}`}
                                    onClick={() => setRoomType('normal')}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                                >
                                    🔓 Normal
                                </button>
                                <button
                                    className={`tab-btn ${roomType === 'ghost' ? 'active' : ''}`}
                                    onClick={() => setRoomType('ghost')}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                                >
                                    👻 Ghost
                                </button>
                                <button
                                    className={`tab-btn ${roomType === 'couples' ? 'active' : ''}`}
                                    onClick={() => setRoomType('couples')}
                                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem' }}
                                >
                                    💑 Couples
                                </button>
                            </div>
                            <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {roomType === 'normal' && 'Persistent room, messages saved'}
                                {roomType === 'ghost' && 'Auto-deletes when everyone leaves'}
                                {roomType === 'couples' && 'Private room, max 2 members'}
                            </div>
                        </div>
                    )}

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
        <div className={`app-layout ${currentRoomType === 'couples' && couplesTheme ? 'theme-couples' : ''}`}>
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
                        <div className="room-type-badge">
                            {currentRoomType === 'normal' && (
                                <span className="room-badge room-badge-normal">🔓 Normal Room</span>
                            )}
                            {currentRoomType === 'ghost' && (
                                <span className="room-badge room-badge-ghost">👻 Ghost Room</span>
                            )}
                            {currentRoomType === 'couples' && (
                                <span className="room-badge room-badge-couples">💑 Couples Room</span>
                            )}
                            <span className="room-badge-desc">
                                {currentRoomType === 'normal' && 'Messages are saved & encrypted'}
                                {currentRoomType === 'ghost' && 'Auto-deletes when everyone leaves'}
                                {currentRoomType === 'couples' && 'Private room, max 2 members'}
                            </span>
                        </div>
                    </div>

                    <div className="info-section">
                        <h3>Active Participants ({users.length})</h3>
                        <div className="users-list-wrapper">
                            {users.map((u, i) => (
                                <div key={i} className="user-item" style={{ animationDelay: `${i * 80}ms` }}>
                                    <div className="user-avatar online">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span style={{ fontSize: '0.95rem' }}>{u.name} {u.name === user.name && '(You)'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <button className="btn btn-outline" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)', marginBottom: '0.5rem' }} onClick={handleReturnHome}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Leave Room
                    </button>

                    {/* Creator gets a direct Delete Room button */}
                    {roomCreatorName && user.name === roomCreatorName && (
                        <button
                            className="btn btn-delete-room"
                            onClick={handleDeleteRoom}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                                <path d="M10 11v6"></path>
                                <path d="M14 11v6"></path>
                                <path d="M9 6V4h6v2"></path>
                            </svg>
                            Delete Room
                        </button>
                    )}

                    {/* Non-creator gets a Request to Delete button */}
                    {roomCreatorName && user.name !== roomCreatorName && (
                        <button
                            className={`btn btn-request-delete ${deleteRequestPending ? 'pending' : ''}`}
                            onClick={handleRequestDeleteRoom}
                            disabled={deleteRequestPending}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.63 4.9 2 2 0 0 1 3.6 2.69h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.93-.93a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17.5l.19-.58z"></path>
                            </svg>
                            {deleteRequestPending ? 'Request Sent…' : 'Request to Delete'}
                        </button>
                    )}
                </div>
            </div>

            <div className="chat-main" style={{ position: 'relative' }}>
                {showGhostToast && (
                    <div className="ghost-toast" style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.9)', color: 'white', padding: '10px 20px', borderRadius: '20px', zIndex: 100, fontWeight: 'bold', fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                        This Ghost Room has been dissolved.
                    </div>
                )}
                {showRoomDeletedToast && (
                    <div className="room-deleted-toast">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                            <path d="M9 6V4h6v2"></path>
                        </svg>
                        {showRoomDeletedToast}
                    </div>
                )}
                {/* Incoming delete request notification — visible only to creator */}
                {incomingDeleteRequest && (
                    <div className="delete-request-notification">
                        <div className="delete-request-content">
                            <div className="delete-request-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                    <line x1="12" y1="9" x2="12" y2="13"></line>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                            </div>
                            <div className="delete-request-text">
                                <strong>{incomingDeleteRequest.requesterName}</strong> is requesting to delete this room.
                                <span>This will permanently erase all messages.</span>
                            </div>
                        </div>
                        <div className="delete-request-actions">
                            <button className="dr-btn dr-btn-reject" onClick={() => handleIncomingDeleteResponse(false)}>Reject</button>
                            <button className="dr-btn dr-btn-approve" onClick={() => handleIncomingDeleteResponse(true)}>Approve &amp; Delete</button>
                        </div>
                    </div>
                )}
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
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src="/onyx-logo.png" alt="Onyx Logo" width="24" height="24" style={{ borderRadius: '6px' }} />
                                Onyx
                                {currentRoomType === 'ghost' && (
                                    <span style={{ background: '#4b5563', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>👻 Ghost</span>
                                )}
                                {currentRoomType === 'couples' && (
                                    <span style={{ background: '#ec4899', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>💑 Couples</span>
                                )}
                            </h2>
                            <span>Fully Encrypted</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {currentRoomType === 'couples' && (
                            <button
                                onClick={() => setCouplesTheme(!couplesTheme)}
                                className={`couples-theme-btn ${couplesTheme ? 'active' : ''}`}
                                title="Toggle Couples Mode"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill={couplesTheme ? 'white' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', color: 'var(--text-primary)', transition: 'all 0.2s' }}
                            title="Toggle Theme"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface-alt)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>
                        <div className="user-avatar" style={{ width: '32px', height: '32px' }}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" />
                            ) : (
                                user.name.charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>
                </div>

                <div
                    className="chat-messages"
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                >
                    {messages.length === 0 ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {currentRoomType === 'couples' ? (
                                <div className="empty-state-couples">
                                    <div className="heart-anim">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                        </svg>
                                    </div>
                                    <div className="heart-pulse-ring heart-pulse-ring-1"></div>
                                    <div className="heart-pulse-ring heart-pulse-ring-2"></div>
                                </div>
                            ) : (
                                <div className="empty-state-normal">
                                    <div className="radar-anim" style={{ opacity: 0.5 }}>
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 2 }}>
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                        <div className="radar-ring radar-ring-1"></div>
                                        <div className="radar-ring radar-ring-2"></div>
                                    </div>
                                </div>
                            )}
                            <p>No messages yet.</p>
                            <p style={{ fontSize: '0.8rem' }}>Messages are E2E encrypted.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((m, i) => {
                                if (m.sender === 'System') {
                                    return <div key={i} className="system-message">{m.message}</div>
                                }

                                // ── Cipher message rendering ──
                                if (m.sender === 'Cipher') {
                                    return (
                                        <div key={i} className="message-wrapper cipher-message" style={{ position: 'relative' }}>
                                            <div className="cipher-sender">
                                                <div className="cipher-avatar">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                    </svg>
                                                </div>
                                                <span>✦ Cipher</span>
                                            </div>
                                            <div className="message-bubble cipher-bubble">
                                                <div
                                                    className="message-content"
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.message, { breaks: true })) }}
                                                />
                                            </div>
                                            <div className="message-footer">
                                                <span>{formatTimestamp(m.timestamp)}</span>
                                                <span className="cipher-badge">AI · E2E</span>
                                                <span className="cipher-private-tag">🔒 Only visible to you</span>
                                            </div>
                                        </div>
                                    )
                                }

                                const isSelf = m.sender === user.name;
                                return (
                                    <div key={i} data-message-id={!isSelf ? m._id : undefined} className={`message-wrapper ${isSelf ? 'sent' : 'received'}`} style={{ position: 'relative' }}>
                                        {!isSelf && <div className="message-sender">{m.sender}</div>}
                                        <div
                                            className="message-bubble"
                                            onTouchStart={(e) => handleTouchStart(e, m)}
                                            onTouchEnd={handleTouchEnd}
                                            onTouchMove={handleTouchEnd}
                                        >
                                            {editingMessageId === m._id ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                                                    <textarea
                                                        value={editText}
                                                        onChange={e => setEditText(e.target.value)}
                                                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'var(--bg-surface-alt)', color: 'var(--text-primary)', resize: 'none' }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingMessageId(null); }} style={{ padding: '4px 8px', borderRadius: '4px', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleSaveEdit(m); }} style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer' }}>Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    className="message-content"
                                                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.message, { breaks: true })) }}
                                                />
                                            )}
                                        </div>
                                        <div className="message-footer" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span>{formatTimestamp(m.timestamp)}</span>
                                            {m.edited && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginLeft: '4px' }}>edited</span>
                                            )}
                                            {isSelf && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="message-status" style={{ display: 'flex' }}>
                                                        {(!m.seenBy || m.seenBy.length === 0) ? (
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        ) : (
                                                            <div style={{ position: 'relative', width: '18px', height: '14px', color: 'var(--accent-primary)' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 0 }}>
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '6px' }}>
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </span>
                                                    <button
                                                        className="message-info-btn"
                                                        onClick={(e) => { e.stopPropagation(); setOpenReceiptId(prev => prev === m._id ? null : m._id); setOpenContextMenuId(null); }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: 0 }}
                                                        title="Message Info"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className="message-info-btn"
                                                        onClick={(e) => handleContextMenu(e, m)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: 0 }}
                                                        title="More options"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="5" r="1.5"></circle>
                                                            <circle cx="12" cy="12" r="1.5"></circle>
                                                            <circle cx="12" cy="19" r="1.5"></circle>
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {isSelf && openContextMenuId === m._id && editingMessageId !== m._id && (
                                            <div
                                                style={{
                                                    position: 'absolute', bottom: '100%', right: '0', marginBottom: '8px',
                                                    background: 'var(--bg-surface-alt)', border: '1px solid var(--border-light)',
                                                    borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                                    fontSize: '0.85rem', zIndex: 101, minWidth: '160px',
                                                    animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    transformOrigin: 'bottom right',
                                                    display: 'flex', flexDirection: 'column',
                                                    overflow: 'hidden'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {Date.now() - new Date(m.timestamp).getTime() <= 20 * 60 * 1000 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEditMessageStart(m); }}
                                                        style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                                                        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                                                        onMouseLeave={e => e.target.style.background = 'transparent'}
                                                    >
                                                        Edit Message
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMessage(m._id); }}
                                                    style={{ padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                                    onMouseEnter={e => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                                >
                                                    Delete for Everyone
                                                </button>
                                            </div>
                                        )}

                                        {isSelf && openReceiptId === m._id && (
                                            <div
                                                style={{
                                                    position: 'absolute', bottom: '100%', right: '0', marginBottom: '8px',
                                                    background: 'var(--bg-surface-alt)', border: '1px solid var(--border-light)',
                                                    borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                                                    fontSize: '0.8rem', zIndex: 100, minWidth: '150px',
                                                    animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                    transformOrigin: 'bottom right'
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    Seen by
                                                </div>
                                                <div style={{ padding: '6px 0', maxHeight: '150px', overflowY: 'auto' }}>
                                                    {(!m.seenBy || m.seenBy.length === 0) ? (
                                                        <div style={{ padding: '4px 12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not seen yet</div>
                                                    ) : (
                                                        m.seenBy.map((s, idx) => (
                                                            <div key={idx} style={{ padding: '4px 12px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                                                                <span><span style={{ color: 'var(--accent-primary)', marginRight: '4px' }}>✓</span> {s.name}</span>
                                                                <span style={{ color: 'var(--text-secondary)' }}>{formatTimestamp(s.seenAt)}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Cipher thinking indicator */}
                            {cipherThinking && (
                                <div className="message-wrapper cipher-message">
                                    <div className="cipher-sender">
                                        <div className="cipher-avatar cipher-thinking-pulse">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                            </svg>
                                        </div>
                                        <span>✦ Cipher is thinking</span>
                                    </div>
                                    <div className="message-bubble cipher-bubble">
                                        <div className="cipher-thinking-dots">
                                            <div className="cipher-dot"></div>
                                            <div className="cipher-dot"></div>
                                            <div className="cipher-dot"></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(() => {
                                const othersTyping = typingUsers.filter(u => u !== user.name);
                                if (othersTyping.length === 0) return null;

                                let typingText = '';
                                if (othersTyping.length === 1) typingText = `${othersTyping[0]} is typing`;
                                else if (othersTyping.length === 2) typingText = `${othersTyping[0]} and ${othersTyping[1]} are typing`;
                                else typingText = `Several people are typing`;

                                return (
                                    <div className="typing-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {othersTyping.length === 1 && (
                                            <div className="user-avatar typing-avatar-ring" style={{ width: '28px', height: '28px', fontSize: '0.8rem', border: 'none', background: 'var(--accent-primary)', color: 'white' }}>
                                                {othersTyping[0].charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{typingText}</span>
                                        <div className="dots" style={{ marginLeft: '4px' }}>
                                            <div className="dot"></div>
                                            <div className="dot"></div>
                                            <div className="dot"></div>
                                        </div>
                                    </div>
                                )
                            })()}
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
                    <div className={`input-pill${message.toLowerCase().startsWith('@cipher') ? ' cipher-mode' : ''}`}>
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
                            placeholder={currentRoomType === 'ghost' ? 'Message (Cipher disabled)' : 'Type @cipher for AI'}
                            rows={1}
                        />
                        <span className={`char-counter${message.length > 100 ? ' visible' : ''}${message.length > 450 ? ' warn' : ''}`}>
                            {message.length > 100 ? `${message.length}/500` : ''}
                        </span>
                    </div>
                    <button
                        ref={sendBtnRef}
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