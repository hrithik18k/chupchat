import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: '' },
    password: { type: String, required: true },
    roomType: { type: String, enum: ['normal', 'ghost', 'couples'], default: 'normal' },
    users: [
        {
            name: String,
            socketId: String
        }
    ]
})

export default mongoose.model('Room', roomSchema)