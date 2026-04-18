import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';

const socket = io(import.meta.env.DEV ? 'http://localhost:5000' : 'https://chupchat.onrender.com');
const secretKey = import.meta.env.VITE_SECRET_KEY;

export const useChatSocket = (user) => {
    const [joined, setJoined] = useState(false);
    const [roomCode, setRoomCode] = useState('');
    const [password, setPassword] = useState('');
    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [typingUsers, setTypingUsers] = useState([]);
    const [roomType, setRoomType] = useState('normal');
    const [currentRoomType, setCurrentRoomType] = useState('normal');
    const [error, setError] = useState('');
    const [roomCreatorName, setRoomCreatorName] = useState('');
    const [incomingDeleteRequest, setIncomingDeleteRequest] = useState(null);
    const [showRoomDeletedToast, setShowRoomDeletedToast] = useState('');
    const [showGhostToast, setShowGhostToast] = useState(false);

    const lastAttemptedRoomRef = useRef('');

    useEffect(() => {
        socket.on('room-created', ({ success, roomType: createdRoomType }) => {
            if (success) {
                setJoined(true);
                setError('');
                if (createdRoomType) setCurrentRoomType(createdRoomType);
                setUsers([{ name: user.name }]);
                setRoomCreatorName(user.name);
            }
        });

        socket.on('room-joined', ({ users, pastMessages, roomType, createdByName }) => {
            setUsers(users);
            setCurrentRoomType(roomType || 'normal');
            setRoomCreatorName(createdByName || '');
            const decrypted = pastMessages.map(m => ({
                _id: m._id,
                sender: m.sender,
                message: CryptoJS.AES.decrypt(m.encryptedMessage, secretKey).toString(CryptoJS.enc.Utf8),
                timestamp: m.timestamp,
                seenBy: m.seenBy || [],
                edited: m.edited || false,
                editedAt: m.editedAt || null
            }));
            setMessages(decrypted);
            setJoined(true);
            setError('');
        });

        socket.on('room-error', msg => {
            setError(msg);
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
            ]);
        });

        socket.on('message-deleted', ({ messageId }) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });

        socket.on('users-typing', setTypingUsers);

        socket.on('room-deleted', ({ message }) => {
            setShowRoomDeletedToast(message);
            setTimeout(() => {
                setShowRoomDeletedToast('');
                setJoined(false);
            }, 2500);
        });

        return () => {
            socket.off('room-created');
            socket.off('room-joined');
            socket.off('room-error');
            socket.off('receive-message');
            socket.off('message-deleted');
            socket.off('users-typing');
            socket.off('room-deleted');
        };
    }, [user, roomCode, password]);

    const send = (msg) => {
        const encryptedMessage = CryptoJS.AES.encrypt(msg, secretKey).toString();
        socket.emit('send-message', { roomCode, encryptedMessage, sender: user.name });
    };

    return {
        joined, setJoined,
        roomCode, setRoomCode,
        password, setPassword,
        users, messages, typingUsers,
        currentRoomType, error, setError,
        roomCreatorName, incomingDeleteRequest,
        showRoomDeletedToast, showGhostToast,
        send
    };
};
