import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    roomCode: String,
    sender: String,
    encryptedMessage: String,
    timestamp: { type: Date, default: Date.now },
    seenBy: { type: [{ name: String, seenAt: Date }], default: [] }
})

export default mongoose.model('Message', messageSchema)
