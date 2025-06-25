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
    res.send('ChupChat backend is running 🚀')
})

io.on('connection', (socket) => {

    socket.on('create-room', async ({ roomCode, user, password }) => {
        let room = await Room.findOne({ code: roomCode })
        if (room) {
            socket.emit('room-error', 'Room already exists')
            return
        }
        room = await Room.create({
            code: roomCode,
            createdBy: user.email || 'guest_' + socket.id,
            password,
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

        socket.emit('room-joined', { users: usersInRoom, pastMessages })
        io.to(roomCode).emit('user-joined', usersInRoom)
    })
    socket.on('send-message', async ({ roomCode, encryptedMessage, sender }) => {
        await Message.create({ roomCode, encryptedMessage, sender })
        io.to(roomCode).emit('receive-message', { encryptedMessage, sender })
    })

    socket.on('typing', ({ roomCode, user }) => {
        socket.to(roomCode).emit('user-typing', user.name)
    })

    socket.on('stop-typing', ({ roomCode }) => {
        socket.to(roomCode).emit('user-stopped-typing')
    })

    socket.on('disconnecting', async () => {
        for (const roomCode of socket.rooms) {
            if (roomCode === socket.id) continue

            const room = await Room.findOne({ code: roomCode })
            if (room) {
                await Room.findOneAndUpdate(
                { code: roomCode },
                { $pull: { users: { socketId: socket.id } } }
            )
            const updatedRoom = await Room.findOne({ code: roomCode })
            io.to(roomCode).emit('user-joined', updatedRoom ? updatedRoom.users : [])
            }
        }
    })
})

const PORT = process.env.PORT || 5000
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})