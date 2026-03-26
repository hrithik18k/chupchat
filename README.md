<div align="center">

<img src="client/public/onyx-logo.png" alt="Onyx Logo" width="80" height="80" style="border-radius: 18px;" />

# Onyx

**Real-time encrypted chat — AES-256, end-to-end, always.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-chupchat.onrender.com-5B5FFF?style=flat-square)](https://chupchat-1.onrender.com)
[![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-black?style=flat-square&logo=socket.io)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat-square&logo=mongodb)](https://www.mongodb.com/)

</div>

---

## What is Onyx?

Onyx is a production-ready MERN + Socket.io chat app where **all messages are encrypted on the client before they ever leave your device**. The server stores and relays only ciphertext — it never sees your plaintext.

---

## Features

### 🔐 Security
- **AES-256 encryption** — all messages encrypted/decrypted in the browser via `crypto-js`
- Server stores only ciphertext; plaintext never hits the backend
- XSS protection on all rendered Markdown via `DOMPurify`

### 🏠 Three Room Types

| Type | Description |
|---|---|
| 🔓 **Normal** | Persistent — messages saved to MongoDB |
| 👻 **Ghost** | Zero-persistence — room + messages auto-purged when everyone leaves |
| 💑 **Couples** | Hard cap of 2 participants for private one-on-one chats |

### ✦ Cipher — AI Assistant
Type `@cipher` to invoke an in-room AI powered by **Groq's LLaMA 3.3 70B**. Responses are only visible to you.

| Command | Effect |
|---|---|
| `@cipher summarize` | Summarize recent messages |
| `@cipher translate <lang>` | Translate recent messages |
| `@cipher tone?` | Analyze tone of the last message |
| `@cipher draft` | Generate 3 reply drafts |
| `@cipher <question>` | Ask anything about the conversation |
| `@cipher help` | Show all commands |

> Cipher is disabled in Ghost rooms for maximum privacy.

### 💬 Chat Features
- **Read receipts** — single tick (delivered) / double ticks (seen), with "Seen by" tooltip
- **Typing indicators** — multi-user, e.g. *"Priya and Rahul are typing…"*
- **Edit messages** within a 20-minute window
- **Delete for everyone** — instantly removes from DB and all clients
- **Markdown rendering** — bold, code blocks, tables, blockquotes
- **File sharing** — up to 50MB, chunked transfer via WebSockets
- **QR code invite** — scan to auto-join a room, no manual entry

### 🎨 UI
- Dark / Light theme toggle, persisted in `localStorage`
- Interactive particle vortex on the login screen
- Animated security background on the room selection screen
- Couples theme — special pink color palette for Couples rooms
- Fully responsive — mobile sidebar drawer included

---

## Tech Stack

**Client** — React 19, Vite 7, Socket.io-client, crypto-js, Firebase Auth, marked, DOMPurify, react-qr-code

**Server** — Node.js, Express 5, Socket.io, Mongoose, Helmet, express-rate-limit

**Services** — MongoDB Atlas (storage), Firebase Auth (Google sign-in), Groq API (Cipher AI)

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas cluster (free tier works)
- Firebase project with Google Auth enabled
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone
```bash
git clone https://github.com/hrithik18k/chupchat.git
cd chupchat
```

### 2. Server
```bash
cd server && npm install
```

Create `server/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

```bash
npm run dev
```

### 3. Client
```bash
cd client && npm install
```

Create `client/.env`:
```env
VITE_SECRET_KEY=any_long_random_string

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm run dev
```

App runs at `http://localhost:5173` — both server and client must be running.

---

## Project Structure

```
chupchat/
├── client/src/
│   ├── components/
│   │   ├── ChatRoom.jsx      # Core chat UI + all socket logic
│   │   ├── login.jsx         # Auth screen
│   │   └── ParticleCanvas.jsx
│   ├── utils/cipher.js       # @cipher command parser + Groq proxy client
│   └── firebase.jsx
│
└── server/
    ├── models/
    │   ├── Message.js        # Encrypted message schema
    │   └── room.js           # Room schema
    └── index.js              # Express + Socket.io + Cipher proxy
```

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/cipher` | Proxy to Groq. Body: `{ systemPrompt, messages[] }` |
| `GET` | `/api/cipher/messages/:roomCode` | Last 20 encrypted messages (for Cipher context) |

---

## Authentication

- **Google Sign-In** via Firebase OAuth popup
- **Guest Mode** — generates an anonymous `Guest####` identity, no account needed

---

## Contributing

1. Fork → create branch → commit → PR against `main`
2. Commit format: `feat: add voice messages`, `fix: ghost room cleanup`

---

## License

Open source. See [LICENSE](LICENSE) for details.

---

<div align="center">Built by <a href="https://github.com/hrithik18k">Hrithik</a></div>
