import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    createdBy: { type: String, required: true },
    password: { type: String, required: true },
    users: [
        {
        name: String,
        socketId: String
        }
    ]
})

export default mongoose.model('Room', roomSchema)
