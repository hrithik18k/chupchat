import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

import Room from './models/room.js'
import Message from './models/Message.js'

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
})

app.use(cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log(' MongoDB Connected'))
    .catch(err => console.log('DB Error:', err))

app.get('/', (req, res) => {
    res.send('Onyx backend is running 🚀')
})

// ── Cipher AI Proxy ─────────────────────────────────────────────────────────
// Proxies requests to Groq API so the API key stays server-side.
// The client sends already-decrypted context (assembled locally) and a prompt.
// We NEVER store the plaintext — it's transient, used only for the API call.
const cipherRateLimit = new Map()
const CIPHER_RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const CIPHER_RATE_LIMIT_MAX = 10 // max 10 requests per minute per IP

app.post('/api/cipher', async (req, res) => {
    try {
        // Basic rate limiting
        const clientIP = req.ip || req.connection.remoteAddress
        const now = Date.now()
        const clientRequests = cipherRateLimit.get(clientIP) || []
        const recentRequests = clientRequests.filter(t => now - t < CIPHER_RATE_LIMIT_WINDOW)
        
        if (recentRequests.length >= CIPHER_RATE_LIMIT_MAX) {
            return res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
        }
        recentRequests.push(now)
        cipherRateLimit.set(clientIP, recentRequests)

        const { systemPrompt, messages } = req.body

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' })
        }

        const groqApiKey = process.env.GROQ_API_KEY
        if (!groqApiKey) {
            console.error('GROQ_API_KEY not set in environment variables')
            return res.status(500).json({ error: 'AI service not configured' })
        }

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqApiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
                    ...messages
                ],
                max_tokens: 1024,
                temperature: 0.7
            })
        })

        if (!groqRes.ok) {
            const errBody = await groqRes.text()
            console.error('Groq API error:', groqRes.status, errBody)
            return res.status(502).json({ error: 'AI service returned an error' })
        }

        const data = await groqRes.json()
        const reply = data.choices?.[0]?.message?.content || 'No response generated.'

        res.json({ reply })
    } catch (error) {
        console.error('Cipher proxy error:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

// Fetch last N encrypted messages for Cipher context assembly
// Note: Only encrypted data is returned — client handles decryption
app.get('/api/cipher/messages/:roomCode', async (req, res) => {
    try {
        const { roomCode } = req.params
        const messages = await Message.find({ roomCode })
            .sort({ timestamp: -1 })
            .limit(20)
            .select('sender encryptedMessage timestamp')
            .lean()
        res.json(messages.reverse())
    } catch (error) {
        console.error('Cipher messages fetch error:', error)
        res.status(500).json({ error: 'Failed to fetch messages' })
    }
})
// ─────────────────────────────────────────────────────────────────────────────

const roomTypingUsers = {}

io.on('connection', (socket) => {

    socket.on('create-room', async ({ roomCode, user, password, roomType }) => {
        let room = await Room.findOne({ code: roomCode })
        if (room) {
            socket.emit('room-error', 'Room already exists')
            return
        }
        room = await Room.create({
            code: roomCode,
            createdBy: user.email || 'guest_' + socket.id,
            createdByName: user.name || '',
            password,
            roomType: roomType || 'normal',
            users: [{ name: user.name, socketId: socket.id }]
        })
        socket.join(roomCode)
        socket.emit('room-created', { success: true, roomType: room.roomType })
    })

    socket.on('join-room', async ({ roomCode, user, password }) => {
        let room = await Room.findOne({ code: roomCode })
        if (!room) {
            socket.emit('room-error', 'Room does not exist')
            return
        }
        if (room.password !== password) {
            socket.emit('room-error', 'Incorrect password')
            return
        }
        if (room.roomType === 'couples' && room.users.length >= 2) {
            socket.emit('room-error', 'This room is full (Couples only)')
            return
        }
        socket.join(roomCode)
        await Room.findOneAndUpdate(
            { code: roomCode },
            { $pull: { users: { socketId: socket.id } } }
        )
        await Room.findOneAndUpdate(
            { code: roomCode },
            { $addToSet: { users: { name: user.name, socketId: socket.id } } }
        )

        const updatedRoom = await Room.findOne({ code: roomCode })
        const usersInRoom = updatedRoom.users.map(u => ({ name: u.name, id: u.socketId }))
        const pastMessages = await Message.find({ roomCode })

        socket.emit('room-joined', {
            users: usersInRoom,
            pastMessages,
            roomType: updatedRoom.roomType,
            createdByName: updatedRoom.createdByName || ''
        })
        io.to(roomCode).emit('user-joined', usersInRoom)
    })
    socket.on('send-message', async ({ roomCode, encryptedMessage, sender, timestamp }) => {
        const saved = await Message.create({ roomCode, encryptedMessage, sender, timestamp })
        io.to(roomCode).emit('receive-message', {
            _id: saved._id.toString(),
            encryptedMessage,
            sender,
            timestamp: saved.timestamp
        })
    })

    socket.on('typing', ({ roomCode, user }) => {
        if (!roomTypingUsers[roomCode]) roomTypingUsers[roomCode] = new Set()
        roomTypingUsers[roomCode].add(user)
        io.to(roomCode).emit('users-typing', Array.from(roomTypingUsers[roomCode]))
    })

    socket.on('stop-typing', ({ roomCode, user }) => {
        if (roomTypingUsers[roomCode]) {
            roomTypingUsers[roomCode].delete(user)
            io.to(roomCode).emit('users-typing', Array.from(roomTypingUsers[roomCode]))
        }
    })

    socket.on('mark-seen', async ({ roomCode, messageIds, userName }) => {
        await Message.updateMany(
            { _id: { $in: messageIds }, 'seenBy.name': { $ne: userName } },
            { $push: { seenBy: { name: userName, seenAt: new Date() } } }
        )
        const updatedMessages = await Message.find(
            { _id: { $in: messageIds } },
            { _id: 1, seenBy: 1 }
        )
        io.to(roomCode).emit('seen-update', updatedMessages)
    })

    socket.on('delete-message', async ({ roomCode, messageId, userName }) => {
        try {
            console.log(`Attempting to delete message ${messageId} for user ${userName} in room ${roomCode}`);
            const deleted = await Message.findOneAndDelete({ _id: messageId, sender: userName });
            if (deleted) {
                console.log(`Deleted successfully: ${messageId}`);
                io.to(roomCode).emit('message-deleted', { messageId });
            } else {
                console.log(`Delete failed - no matching message found for sender ${userName} with id ${messageId}`);
                socket.emit('edit-error', { error: 'Delete failed. Message not found or you are not the sender.' });
            }
        } catch (error) {
            console.error('Error in delete-message:', error);
            socket.emit('edit-error', { error: 'Internal server error while deleting message' });
        }
    });

    socket.on('edit-message', async ({ roomCode, messageId, newEncryptedMessage, userName }) => {
        try {
            console.log(`Attempting to edit message ${messageId} for user ${userName} in room ${roomCode}`);
            const message = await Message.findOne({ _id: messageId, sender: userName });
            if (message) {
                const timeDiff = Date.now() - new Date(message.timestamp).getTime();
                if (timeDiff <= 20 * 60 * 1000) {
                    const editedAt = new Date();
                    await Message.updateOne({ _id: messageId }, { encryptedMessage: newEncryptedMessage, edited: true, editedAt });
                    console.log(`Edited successfully: ${messageId}`);
                    io.to(roomCode).emit('message-edited', { messageId, newEncryptedMessage, editedAt });
                } else {
                    console.log(`Edit failed - window expired for message ${messageId}`);
                    socket.emit('edit-error', { error: 'Edit window has expired' });
                }
            } else {
                console.log(`Edit failed - no matching message found for sender ${userName} with id ${messageId}`);
                socket.emit('edit-error', { error: 'Edit failed. Message not found or you are not the sender.' });
            }
        } catch (error) {
            console.error('Error in edit-message:', error);
            socket.emit('edit-error', { error: 'Internal server error while editing message' });
        }
    });

    // ── Room Deletion Flow ────────────────────────────────────────────────────
    // Creator deletes directly
    socket.on('delete-room', async ({ roomCode, userName }) => {
        try {
            const room = await Room.findOne({ code: roomCode })
            if (!room) return socket.emit('room-error', 'Room not found')
            if (room.createdByName !== userName) {
                return socket.emit('room-error', 'Only the room creator can delete this room')
            }
            await Message.deleteMany({ roomCode })
            await Room.deleteOne({ code: roomCode })
            io.to(roomCode).emit('room-deleted', { message: `Room was deleted by ${userName}.` })
            console.log(`Room ${roomCode} deleted by creator ${userName}`)
        } catch (err) {
            console.error('delete-room error:', err)
            socket.emit('room-error', 'Failed to delete room')
        }
    })

    // Non-creator requests deletion — server forwards to the creator
    socket.on('request-delete-room', async ({ roomCode, requesterName }) => {
        try {
            const room = await Room.findOne({ code: roomCode })
            if (!room) return
            // Find the creator's current socket
            const creatorUser = room.users.find(u => u.name === room.createdByName)
            if (!creatorUser) {
                // Creator is offline — let requester know
                return socket.emit('delete-request-result', {
                    status: 'offline',
                    message: 'The room creator is not currently online.'
                })
            }
            // Forward the request to the creator's socket
            io.to(creatorUser.socketId).emit('incoming-delete-request', {
                roomCode,
                requesterName
            })
        } catch (err) {
            console.error('request-delete-room error:', err)
        }
    })

    // Creator approves — delete the room
    socket.on('approve-delete-room', async ({ roomCode, userName }) => {
        try {
            const room = await Room.findOne({ code: roomCode })
            if (!room) return
            if (room.createdByName !== userName) return
            await Message.deleteMany({ roomCode })
            await Room.deleteOne({ code: roomCode })
            io.to(roomCode).emit('room-deleted', { message: 'The room creator approved the deletion request. Room closed.' })
            console.log(`Room ${roomCode} deleted after approval by creator ${userName}`)
        } catch (err) {
            console.error('approve-delete-room error:', err)
        }
    })

    // Creator rejects — notify all in room
    socket.on('reject-delete-room', ({ roomCode, requesterName }) => {
        io.to(roomCode).emit('delete-request-rejected', { requesterName })
    })
    // ─────────────────────────────────────────────────────────────────────────

    socket.on('leave-room', async ({ roomCode, user }) => {
        socket.leave(roomCode)
        const room = await Room.findOne({ code: roomCode })
        if (room) {
            const userObj = room.users.find(u => u.socketId === socket.id)
            if (userObj && roomTypingUsers[roomCode]) {
                roomTypingUsers[roomCode].delete(userObj.name)
                io.to(roomCode).emit('users-typing', Array.from(roomTypingUsers[roomCode]))
            }

            await Room.findOneAndUpdate(
                { code: roomCode },
                { $pull: { users: { socketId: socket.id } } }
            )
            const updatedRoom = await Room.findOne({ code: roomCode })
            if (updatedRoom && updatedRoom.users.length === 0 && updatedRoom.roomType === 'ghost') {
                await Message.deleteMany({ roomCode })
                await Room.deleteOne({ code: roomCode })
                io.to(roomCode).emit('room-closed')
            } else {
                io.to(roomCode).emit('user-left', updatedRoom ? updatedRoom.users : [])
            }
        }
    })

    socket.on('disconnecting', async () => {
        for (const roomCode of socket.rooms) {
            if (roomCode === socket.id) continue

            const room = await Room.findOne({ code: roomCode })
            if (room) {
                const userObj = room.users.find(u => u.socketId === socket.id)
                if (userObj && roomTypingUsers[roomCode]) {
                    roomTypingUsers[roomCode].delete(userObj.name)
                    io.to(roomCode).emit('users-typing', Array.from(roomTypingUsers[roomCode]))
                }

                await Room.findOneAndUpdate(
                    { code: roomCode },
                    { $pull: { users: { socketId: socket.id } } }
                )
                const updatedRoom = await Room.findOne({ code: roomCode })
                if (updatedRoom && updatedRoom.users.length === 0 && updatedRoom.roomType === 'ghost') {
                    await Message.deleteMany({ roomCode })
                    await Room.deleteOne({ code: roomCode })
                    io.to(roomCode).emit('room-closed')
                } else {
                    io.to(roomCode).emit('user-left', updatedRoom ? updatedRoom.users : [])
                }
            }
        }
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})