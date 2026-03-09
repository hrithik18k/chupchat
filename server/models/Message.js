import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    roomCode: String,
    sender: String,
    encryptedMessage: String,
    timestamp: { type: Date, default: Date.now },
    seenBy: { type: [{ name: String, seenAt: Date }], default: [] },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date }
})

export default mongoose.model('Message', messageSchema)
