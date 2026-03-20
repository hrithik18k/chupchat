<div align="center">

<img src="client/public/onyx-logo.png" alt="Onyx Logo" width="90" height="90" style="border-radius: 20px;" />

# Onyx

**Enterprise-Grade Encrypted Real-Time Chat**

[![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite_7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[Live Demo](https://chupchat-1.onrender.com) · [Report Bug](https://github.com/hrithik18k/chupchat/issues) · [Request Feature](https://github.com/hrithik18k/chupchat/issues)

</div>

---

## Overview

**Onyx** is a production-ready, real-time encrypted chat application built on the MERN stack with Socket.io WebSockets. All messages are encrypted client-side using AES-256 before transmission — the server stores and relays only ciphertext, never plaintext.

Beyond secure messaging, Onyx ships with an embedded AI assistant called **Cipher** (powered by Groq's LLaMA 3.3 70B), a QR-based invite system, read receipts with seen-by tooltips, multi-user typing indicators, three distinct room modes, and a reactive dual-theme UI.

---

## Features

### 🔐 End-to-End Encryption
All messages are encrypted and decrypted strictly on the client using `crypto-js` (AES-256). The server never processes plaintext message content. Encrypted payloads are stored in MongoDB and re-transmitted as-is.

### 🏠 Three Room Modes

| Mode | Behaviour |
|---|---|
| 🔓 **Normal** | Persistent room. Encrypted messages are stored in MongoDB and loaded for new joiners. |
| 👻 **Ghost** | Zero-persistence. The room and all its messages are automatically purged the moment every participant disconnects. Cipher AI is disabled in this mode to maximise privacy. |
| 💑 **Couples** | Hard-capped at 2 participants. Designed for private one-on-one conversations. |

### ✦ Cipher — In-Room AI Assistant
An AI participant powered by Groq's LLaMA 3.3 70B, accessible via `@cipher` commands. All context assembly and decryption happens locally; only anonymised plaintext reaches the server proxy. Cipher's replies are visible only to the user who invoked it.

| Command | Effect |
|---|---|
| `@cipher summarize` | Concise summary of recent messages |
| `@cipher translate <lang>` | Translates recent messages into the target language |
| `@cipher tone?` | Analyses the tone of the last message |
| `@cipher draft` | Generates 3 draft replies (Professional / Friendly / Concise) |
| `@cipher <question>` | Open-ended question answered in conversation context |
| `@cipher help` | Displays the full command reference |

### 📡 Advanced Socket Telemetry
- **Read Receipts** — Sent messages show a single tick (delivered) or double ticks in accent colour (seen). An info button reveals a "Seen by" tooltip with each viewer's name and timestamp, using the browser's native `IntersectionObserver` API.
- **Multi-User Typing Indicators** — Real-time bouncing dot animation that gracefully aggregates multiple simultaneous typers: *"Priya and Rahul are typing…"*

### 📲 QR Auto-Join
Each room generates a live QR code in the sidebar encoding `/?room=CODE&pwd=PASS`. Scanning it pre-fills and submits the join form — no manual entry required.

### ✏️ Message Management
- **Edit** messages within a 20-minute window (broadcast to all room members).
- **Delete for Everyone** — permanently removes a message from the database and all connected clients in real time.

### 🗑️ Room Deletion Flow
- **Room creator** can delete the room and all its messages instantly for everyone.
- **Non-creators** can send a deletion request to the creator. The creator sees an in-room notification and can approve or reject. Approval triggers immediate room destruction.

### 📝 Rich Markdown
Messages render full Markdown (bold, italics, code blocks, tables, blockquotes) via `marked`, sanitised against XSS with `DOMPurify`.

### 🔑 Dual Authentication
- **Google Sign-In** via Firebase Authentication.
- **Guest Mode** — generates an anonymous `Guest####` identity. No account required.

### 🎨 Dual-Theme UI
Dark (Electric Slate) and Light (Pure Canvas) modes with a single click. The preference persists via `localStorage`. The login screen features an interactive particle vortex canvas that responds to cursor movement.

---

## Architecture

```
chupchat/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── ChatRoom.jsx    # Core chat UI, socket event handling
│       │   ├── login.jsx       # Authentication screen
│       │   └── ParticleCanvas.jsx  # Animated login background
│       ├── utils/
│       │   └── cipher.js       # @cipher command parser + Groq proxy client
│       ├── firebase.jsx        # Firebase Auth initialisation
│       ├── App.jsx             # Root component, theme management, mouse-follower gradient
│       └── App.css             # Full design system (CSS custom properties)
│
└── server/                     # Node.js + Express backend
    ├── models/
    │   ├── Message.js          # Encrypted message schema
    │   └── room.js             # Room schema (code, type, users, creator)
    └── index.js                # Express server, Socket.io handlers, Cipher proxy, REST endpoints
```

---

## Tech Stack

### Client
| Package | Version | Purpose |
|---|---|---|
| React | 19.1 | UI framework |
| Vite + SWC | 7.0 | Build tool & compiler |
| socket.io-client | 4.8 | Real-time WebSocket client |
| crypto-js | 4.2 | AES-256 client-side encryption |
| firebase | 11.9 | Google Authentication |
| marked | 17.0 | Markdown rendering |
| dompurify | 3.3 | XSS sanitisation |
| react-qr-code | 2.0 | QR code generation |

### Server
| Package | Version | Purpose |
|---|---|---|
| Node.js + Express | 5.1 | HTTP server & REST API |
| socket.io | 4.8 | WebSocket server |
| mongoose | 8.16 | MongoDB ODM |
| cors | 2.8 | CORS middleware |
| dotenv | 16.5 | Environment variable loading |
| helmet | 8.1 | HTTP security headers |
| express-rate-limit | 8.0 | Request rate limiting |
| nodemon | 3.1 | Development hot-reload |

### External Services
| Service | Usage |
|---|---|
| MongoDB Atlas | Encrypted message and room persistence |
| Firebase Auth | Google sign-in via OAuth popup |
| Groq API (LLaMA 3.3 70B) | Cipher AI responses |

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (free tier works)
- A Firebase project with Google Auth enabled

### 1. Clone the Repository
```bash
git clone https://github.com/hrithik18k/chupchat.git
cd chupchat
```

### 2. Configure & Run the Server
```bash
cd server
npm install
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
The backend starts on `http://localhost:5000`.

### 3. Configure & Run the Client
```bash
cd client
npm install
```

Create `client/.env`:
```env
# AES encryption key — generate a strong random string
VITE_SECRET_KEY=generate_a_long_random_string_here

# Firebase project config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

```bash
npm run dev
```
The app is available at `http://localhost:5173`.

> **Note:** Both the server and client must be running simultaneously for the app to function.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Server reads messages | AES-256 encryption on client; server only stores ciphertext |
| XSS via Markdown | All rendered HTML is sanitised by `DOMPurify` before injection |
| Groq API key exposure | Key lives in server `.env`; client calls a local proxy endpoint |
| Cipher context leakage | Messages are decrypted locally; anonymised text (`[participant]`) is sent to Groq — never raw usernames |
| Rate abuse of Cipher | Server-side rate limiter: 10 Cipher requests per IP per minute |
| Brute-force joins | Room codes (4–8 alphanumeric) + 4-digit numeric passwords |
| Ghost room data retention | All messages and room records are deleted from MongoDB upon full disconnect |

---

## Design System

Onyx uses a single CSS custom-property token system defined in `App.css`. Switching themes updates `[data-theme]` on `<html>` and all tokens cascade automatically.

| Token | Dark | Light |
|---|---|---|
| `--bg-base` | `#050B18` | `#f1f5f9` |
| `--bg-surface` | `#0a1120` | `#ffffff` |
| `--bg-surface-alt` | `#121c33` | `#e2e8f0` |
| `--accent-primary` | `#5B5FFF` | `#4f46e5` |
| `--accent-hover` | `#4a4edf` | `#4338ca` |
| `--text-primary` | `#ffffff` | `#0f172a` |
| `--text-secondary` | `#8b98a9` | `#475569` |

**Typefaces:** [Syne](https://fonts.google.com/specimen/Syne) (headings) · [DM Sans](https://fonts.google.com/specimen/DM+Sans) (body)

---

## API Reference

### REST Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/cipher` | Proxies a request to Groq. Accepts `{ systemPrompt, messages[] }`. Returns `{ reply }`. Rate-limited. |
| `GET` | `/api/cipher/messages/:roomCode` | Returns the last 20 encrypted messages for a room (for Cipher context assembly). Returns `sender`, `encryptedMessage`, `timestamp` only. |

### Key Socket Events

| Event | Direction | Payload |
|---|---|---|
| `create-room` | Client → Server | `{ roomCode, user, password, roomType }` |
| `join-room` | Client → Server | `{ roomCode, user, password }` |
| `send-message` | Client → Server | `{ roomCode, encryptedMessage, sender, timestamp }` |
| `edit-message` | Client → Server | `{ roomCode, messageId, newEncryptedMessage, userName }` |
| `delete-message` | Client → Server | `{ roomCode, messageId, userName }` |
| `mark-seen` | Client → Server | `{ roomCode, messageIds[], userName }` |
| `typing` / `stop-typing` | Client → Server | `{ roomCode, user }` |
| `delete-room` | Client → Server | `{ roomCode, userName }` (creator only) |
| `request-delete-room` | Client → Server | `{ roomCode, requesterName }` |
| `approve-delete-room` | Client → Server | `{ roomCode, userName }` |
| `room-joined` | Server → Client | `{ users, pastMessages, roomType, createdByName }` |
| `receive-message` | Server → Client | `{ _id, encryptedMessage, sender, timestamp }` |
| `seen-update` | Server → Client | `[{ _id, seenBy[] }]` |
| `users-typing` | Server → Client | `string[]` |
| `room-deleted` | Server → Client | `{ message }` |
| `room-closed` | Server → Client | *(Ghost room auto-destruction)* |

---

## Contributing

Contributions are welcome. Please follow the standard fork-and-PR workflow:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit with a descriptive message: `git commit -m "feat: add voice message support"`
4. Push the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`

---

## License

This project is open source. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built by <a href="https://github.com/hrithik18k">Hrithik</a></p>
</div>