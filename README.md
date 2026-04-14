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
- Server-side API key proxying — Groq API key is never exposed to the client

### 🏠 Three Room Types

| Type | Description |
|---|---|
| 🔓 **Normal** | Persistent — messages saved to MongoDB |
| 👻 **Ghost** | Zero-persistence — room + messages auto-purged when everyone leaves |
| 💑 **Couples** | Hard cap of 2 participants for private one-on-one chats |

### ✦ Cipher — AI Assistant
Type `@cipher` in any normal or couples room to invoke an in-room AI powered by **Groq's LLaMA 3.3 70B**. Chat context is decrypted locally before being sent — the server only proxies already-assembled plaintext and never persists it. Responses are only visible to you.

| Command | Effect |
|---|---|
| `@cipher summarize` | Summarize recent messages |
| `@cipher translate <lang>` | Translate recent messages into the specified language |
| `@cipher tone?` | Analyze the tone of the last message |
| `@cipher draft` | Generate 3 reply drafts (Professional / Friendly / Concise) |
| `@cipher <question>` | Ask anything about the conversation |
| `@cipher help` | Show all commands |

> Cipher is disabled in Ghost rooms for maximum privacy.

### 💬 Chat Features
- **Read receipts** — single tick (delivered) / double ticks (seen), with a "Seen by" tooltip showing each viewer and timestamp
- **Typing indicators** — multi-user aware, e.g. *"Priya and Rahul are typing…"*
- **Edit messages** within a 20-minute window (encrypted in-flight)
- **Delete for everyone** — instantly removes from DB and all connected clients
- **Markdown rendering** — bold, inline code, code blocks, tables, blockquotes, lists
- **File sharing** — up to 50 MB, chunked binary transfer via WebSockets (no third-party storage)
- **QR code invite** — scan to auto-join a room with the password pre-filled
- **Recently joined rooms** — quick-rejoin list stored in `localStorage`, auto-purged when rooms no longer exist

### 🗑️ Room Management
- **Creator** can permanently delete a room and all its messages for everyone
- **Non-creator** can send a deletion request; the creator can approve or reject it in real time
- Ghost rooms self-destruct automatically when the last participant leaves

### 🎨 UI & UX
- Dark / Light theme toggle, persisted in `localStorage`
- **Couples theme** — optional pink color palette for Couples rooms, toggled via a heart button in the header
- Interactive particle vortex on the login screen (scales down on mobile/low-memory devices)
- Animated security radar background on the room selection screen (orbit dots, matrix rain, scan lines — all GPU-accelerated, disabled on mobile for 60 fps)
- Spring-physics animations throughout: message bubbles, send button pop, toast bounce-in, system message expand
- Fully responsive — hamburger + slide-in sidebar drawer on mobile
- Custom scrollbar styling, `prefers-reduced-motion` respected everywhere

---

## Tech Stack

**Client** — React 19, Vite 7, Socket.io-client, crypto-js, Firebase Auth, marked, DOMPurify, react-qr-code

**Server** — Node.js, Express 5, Socket.io 4, Mongoose, Helmet, express-rate-limit

**Services** — MongoDB Atlas (storage), Firebase Auth (Google sign-in), Groq API (Cipher AI via LLaMA 3.3 70B)

---

## Architecture Notes

```
Browser                        Server                        External
──────────────────────         ──────────────────────────    ──────────────
 plaintext message             receives ciphertext only
      │                               │
      ▼                               │
 AES-256 encrypt (crypto-js)          │
      │                               │
      └──── Socket.io ───────────────►│──── MongoDB Atlas (ciphertext)
                                      │
 @cipher command                      │
      │                               │
      ▼                               │
 decrypt context locally              │
      └──── HTTP POST ───────────────►│──── Groq API (transient plaintext)
                                      │     (never stored)
```

- The **VITE_SECRET_KEY** used for AES encryption lives only in the browser environment. All participants in a room share the same key (set via env var).
- Cipher context is assembled and decrypted **client-side**; only the resulting plaintext prompt travels to the server proxy — it is never written to any database.
- File transfers are chunked (256 KB chunks) and relayed through the Socket.io server in RAM. No file data is ever written to disk or a database.

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

> **Note:** All room participants must use the same `VITE_SECRET_KEY` to decrypt each other's messages. In production, this key is baked into the deployed client bundle.

---

## Project Structure

```
chupchat/
├── client/
│   ├── public/
│   │   └── onyx-logo.png
│   └── src/
│       ├── components/
│       │   ├── ChatRoom.jsx        # Core chat UI, all socket event handlers, file transfer
│       │   ├── login.jsx           # Google + Guest auth screen
│       │   └── ParticleCanvas.jsx  # Reusable canvas particle system (full / ambient variants)
│       ├── utils/
│       │   └── cipher.js           # @cipher command parser, prompt builder, Groq proxy client
│       ├── firebase.jsx            # Firebase init + Google sign-in helper
│       ├── App.jsx                 # Root: theme state, mouse-follower gradient, routing
│       ├── App.css                 # Full design system, animations, responsive rules
│       └── index.css               # Base resets
│
└── server/
    ├── models/
    │   ├── Message.js              # Encrypted message schema (roomCode, sender, encryptedMessage, seenBy)
    │   └── room.js                 # Room schema (code, password, roomType, users[], createdByName)
    └── index.js                    # Express app, Socket.io handlers, Cipher proxy, file relay
```

---

## API Reference

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/cipher` | Proxy to Groq. Body: `{ systemPrompt, messages[] }`. Rate-limited: 10 req/min per IP. |
| `GET` | `/api/cipher/messages/:roomCode` | Last 20 encrypted messages for client-side Cipher context assembly |

### Socket.io Events (Client → Server)

| Event | Payload | Description |
|---|---|---|
| `create-room` | `{ roomCode, user, password, roomType }` | Create a new room |
| `join-room` | `{ roomCode, user, password }` | Join an existing room |
| `leave-room` | `{ roomCode, user }` | Leave gracefully |
| `send-message` | `{ roomCode, encryptedMessage, sender, timestamp }` | Broadcast a message |
| `edit-message` | `{ roomCode, messageId, newEncryptedMessage, userName }` | Edit within 20-min window |
| `delete-message` | `{ roomCode, messageId, userName }` | Delete for everyone |
| `typing` / `stop-typing` | `{ roomCode, user }` | Typing indicator control |
| `mark-seen` | `{ roomCode, messageIds[], userName }` | Update read receipts |
| `file-transfer-start` | `{ transferId, roomCode, sender, fileName, fileType, fileSize, totalChunks }` | Begin chunked file transfer |
| `file-chunk` | `{ transferId, roomCode, chunkIndex, chunk }` | Send a 256 KB base64 chunk |
| `delete-room` | `{ roomCode, userName }` | Creator deletes the room |
| `request-delete-room` | `{ roomCode, requesterName }` | Non-creator requests deletion |
| `approve-delete-room` | `{ roomCode, userName }` | Creator approves deletion request |
| `reject-delete-room` | `{ roomCode, requesterName }` | Creator rejects deletion request |
| `verify-recent-rooms` | `{ roomCodes[] }` | Check which recent rooms still exist |

---

## Authentication

- **Google Sign-In** via Firebase OAuth popup
- **Guest Mode** — generates an anonymous `Guest####` identity stored in `localStorage`; no account needed

---

## Known Limitations

- **File transfer RAM** — files are buffered in server RAM during relay. The free-tier Render instance (512 MB) may struggle with multiple concurrent large file transfers.
- **Shared encryption key** — AES-256 is symmetric; all room participants share the key embedded in the client build. This protects data at rest and in transit from the server, but participants themselves can decrypt all messages by design.
- **No message pagination** — all past messages for a room are fetched on join. Large rooms with many messages may have slower load times.

---

## Contributing

1. Fork → create branch → commit → PR against `main`
2. Commit format: `feat: add voice messages`, `fix: ghost room cleanup`

---

## License

Open source. See [LICENSE](LICENSE) for details.

---

<div align="center">Built by <a href="https://github.com/hrithik18k">Hrithik</a></div>
