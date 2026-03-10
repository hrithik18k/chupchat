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
            password,
            roomType: roomType || 'normal',
            users: [{ name: user.name, socketId: socket.id }]
        })
        socket.join(roomCode)
        socket.emit('room-created', { success: true })
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

        socket.emit('room-joined', { users: usersInRoom, pastMessages, roomType: updatedRoom.roomType })
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
                    io.to(roomCode).emit('user-joined', updatedRoom ? updatedRoom.users : [])
                }
            }
        }
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})