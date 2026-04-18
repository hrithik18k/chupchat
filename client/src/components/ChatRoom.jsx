import React, { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import CryptoJS from 'crypto-js'
import PropTypes from 'prop-types'
import { parseCipherCommand, invokeCipher } from '../utils/cipher.js'

// Components
import RoomSelection from './RoomSelection.jsx'
import ChatSidebar from './ChatSidebar.jsx'
import MessageItem from './MessageItem.jsx'

const socket = io(import.meta.env.DEV ? 'http://localhost:5000' : 'https://chupchat.onrender.com')
const secretKey = import.meta.env.VITE_SECRET_KEY

const ChatRoom = ({ user, clearUser, theme, toggleTheme }) => {
    // --- State ---
    const [roomCode, setRoomCode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') || '';
    });
    const [password, setPassword] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('pwd') || '';
    });
    const [joined, setJoined] = useState(false);
    const [mode, setMode] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('room') ? 'join' : 'create';
    });
    const [error, setError] = useState('')
    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState('')
    const [typingUsers, setTypingUsers] = useState([])
    const [roomType, setRoomType] = useState('normal')
    const [currentRoomType, setCurrentRoomType] = useState('normal')
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
    const [editingMessageId, setEditingMessageId] = useState(null)
    const [editText, setEditText] = useState('')
    const [openContextMenuId, setOpenContextMenuId] = useState(null)
    const [cipherThinking, setCipherThinking] = useState(false)
    const [roomCreatorName, setRoomCreatorName] = useState('')
    const [deleteRequestPending, setDeleteRequestPending] = useState(false)
    const [incomingDeleteRequest, setIncomingDeleteRequest] = useState(null)
    const [showRoomDeletedToast, setShowRoomDeletedToast] = useState('')
    const [recentRooms, setRecentRooms] = useState(() => {
        const saved = localStorage.getItem(`onyx-recent-rooms-${user?.name || 'guest'}`);
        return saved ? JSON.parse(saved) : [];
    });
    const [transferProgress, setTransferProgress] = useState({});

    // --- Refs ---
    const messagesEndRef = useRef(null)
    const messagesContainerRef = useRef(null)
    const typingTimeoutRef = useRef(null)
    const autoJoinAttempted = useRef(false)
    const lastAttemptedRoomRef = useRef('')

    // --- Socket Listeners ---
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
                setRoomCreatorName(user.name)
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
            saveRecentRoom(lastAttemptedRoomRef.current || roomCode, password)
            window.history.pushState({}, '', `/?room=${lastAttemptedRoomRef.current || roomCode}&pwd=${password}`)
            setTimeout(() => scrollToBottom(), 100)
        })

        socket.on('room-error', msg => {
            setError(msg)
        })

        socket.on('user-joined', (updatedUsers) => {
            setUsers(updatedUsers);
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

        socket.on('room-deleted', ({ message }) => {
            setShowRoomDeletedToast(message)
            setTimeout(() => {
                setShowRoomDeletedToast('')
                handleReturnHomeSilent()
            }, 2500)
        })

        return () => {
            socket.off('room-created')
            socket.off('room-joined')
            socket.off('room-error')
            socket.off('user-joined')
            socket.off('receive-message')
            socket.off('room-deleted')
        }
    }, [roomCode, password, user.name, users, user])

    // --- Helpers ---
    const saveRecentRoom = (code, pwd) => {
        if (!code) return;
        setRecentRooms(prev => {
            const filtered = prev.filter(r => r.roomCode !== code);
            const updated = [{ roomCode: code, password: pwd, timestamp: Date.now() }, ...filtered].slice(0, 3);
            localStorage.setItem(`onyx-recent-rooms-${user?.name || 'guest'}`, JSON.stringify(updated));
            return updated;
        });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleReturnHomeSilent = () => {
        socket.emit('leave-room', { roomCode, user });
        window.history.pushState({}, '', '/')
        setJoined(false)
        setRoomCode('')
        setPassword('')
        setMessages([])
        setError('')
        setMode('join')
    }

    const createRoom = () => {
        socket.emit('create-room', { roomCode, user, password, roomType })
    }

    const joinRoom = () => {
        lastAttemptedRoomRef.current = roomCode;
        socket.emit('join-room', { roomCode, user, password })
    }

    const sendMessage = async () => {
        if (!message.trim()) return
        const encryptedMessage = CryptoJS.AES.encrypt(message, secretKey).toString()
        const timestamp = new Date().toISOString()
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name, timestamp })
        setMessage('')
        socket.emit('stop-typing', { roomCode, user: user.name });
    }

    const handleTyping = (e) => {
        setMessage(e.target.value)
        if (e.target.value.length > 0) {
            socket.emit('typing', { roomCode, user: user.name })
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = setTimeout(() => {
                socket.emit('stop-typing', { roomCode, user: user.name })
            }, 3000);
        } else {
            socket.emit('stop-typing', { roomCode, user: user.name })
        }
    }

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // --- Render ---
    if (!joined) {
        return (
            <div className="room-selection-container">
                <RoomSelection
                    mode={mode}
                    setMode={setMode}
                    roomCode={roomCode}
                    setRoomCode={setRoomCode}
                    password={password}
                    setPassword={setPassword}
                    roomType={roomType}
                    setRoomType={setRoomType}
                    error={error}
                    createRoom={createRoom}
                    joinRoom={joinRoom}
                    recentRooms={recentRooms}
                />
            </div>
        )
    }

    return (
        <div className="app-layout">
            <ChatSidebar
                mobileSidebarOpen={mobileSidebarOpen}
                setMobileSidebarOpen={setMobileSidebarOpen}
                roomCode={roomCode}
                password={password}
                currentRoomType={currentRoomType}
                users={users}
                user={user}
                handleDeleteRoom={() => socket.emit('delete-room', { roomCode, userName: user.name })}
                handleRequestDeleteRoom={() => socket.emit('request-delete-room', { roomCode, requesterName: user.name })}
                deleteRequestPending={deleteRequestPending}
                roomCreatorName={roomCreatorName}
                handleReturnHome={handleReturnHomeSilent}
            />

            <main className="chat-main">
                <header className="chat-header">
                    <div className="chat-header-left">
                        <button className="hamburger-btn" onClick={() => setMobileSidebarOpen(true)}>☰</button>
                        <div className="chat-title">
                            <h2>Room: {roomCode}</h2>
                            <span>{users.length} participants online</span>
                        </div>
                    </div>
                </header>

                <div className="chat-messages" ref={messagesContainerRef}>
                    {messages.map((m) => (
                        <MessageItem
                            key={m._id || m.timestamp}
                            m={m}
                            user={user}
                            formatTimestamp={formatTimestamp}
                            handleContextMenu={() => {}}
                            openReceiptId={null}
                            setOpenReceiptId={() => {}}
                            editingMessageId={editingMessageId}
                            editText={editText}
                            setEditText={setEditText}
                            handleSaveEdit={() => {}}
                            setEditingMessageId={setEditingMessageId}
                            openContextMenuId={openContextMenuId}
                            handleDeleteMessage={() => {}}
                            handleEditMessageStart={() => {}}
                            transferProgress={transferProgress}
                        />
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div className="chat-input-area">
                    <div className="input-pill">
                        <textarea
                            className="chat-input"
                            value={message}
                            onChange={handleTyping}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                            placeholder="Type a message..."
                        />
                        <button className="send-btn" onClick={sendMessage}>Send</button>
                    </div>
                </div>
            </main>

            {showRoomDeletedToast && <div className="room-deleted-toast">{showRoomDeletedToast}</div>}
        </div>
    )
}

ChatRoom.propTypes = {
    user: PropTypes.shape({
        name: PropTypes.string.isRequired,
        photoURL: PropTypes.string
    }).isRequired,
    clearUser: PropTypes.func.isRequired,
    theme: PropTypes.string.isRequired,
    toggleTheme: PropTypes.func.isRequired
}

export default ChatRoom;