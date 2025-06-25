import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    roomCode: String,
    sender: String,
    encryptedMessage: String,
    timestamp: { type: Date, default: Date.now }
})

export default mongoose.model('Message', messageSchema)
