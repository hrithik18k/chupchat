<div align="center">

# 🔒 [Onyx](https://chupchat-1.onrender.com/)
**Enterprise-Grade Secure & Encrypted Real-Time Chat Architecture**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

[Report Bug](https://github.com/hrithik18k/chupchat/issues) · [Request Feature](https://github.com/hrithik18k/chupchat/issues)

</div>

---

## ⚡ Overview

**Onyx** is an advanced, premium-tier real-time chat application engineered for maximum privacy, security, and elegance. Built entirely on the MERN stack with highly scaled WebSockets, it leverages military-grade AES encryption to guard its messages and pairs it with an aggressively minimal, luxury glassmorphism interface. 

It is designed to give users a pristine, ad-free environment where text data remains inherently their own. Recently upgraded with advanced socket telemetry, Onyx now features intelligent read receipts, persistent typing presence, conditional room destruction models, and reactive theming.

## ✨ Key Features & Capabilities

- **End-to-End Encryption (AES):** All chat messages are encrypted and decrypted strictly on the client-side utilizing Crypto-js. The server never reads the plain-text message contents.
- **Advanced Room Architecture:** 
  - 🔓 **Normal Rooms:** Persistent lobbies for standard group chats.
  - 👻 **Ghost Rooms:** Maximum privacy. The room instantly auto-destructs and purges all DB records the moment all participants disconnect.
  - 💑 **Couples Rooms:** Strictly capped at a maximum of 2 participants for fully private 1-on-1 conversations.
- **Enterprise-Grade UI/UX:** Fully responsive layout modeled after top-tier B2B environments. Includes a localized **Dark/Light Mode toggle**, crisp *Syne* & *DM Sans* typography, and WhatsApp/Telegram-style message bubbles.
- **Advanced Chat Telemetry:** 
  - **Read Receipts:** Track exactly who saw your messages and when. Sent messages feature dynamic double-ticks (`✓✓`) and a hoverable "Seen By" tooltip overlay.
  - **Multi-User Typing Indicators:** Real-time bouncing dot animations that smartly aggregate multiple users (e.g., "Priya and Rahul are typing...").
- **Frictionless QR Auto-Join:** Generate a secure, room-specific QR code natively within any chat. When scanned, it bypasses the lobby via parametric URL decoding (`/?room=X&pwd=Y`).
- **Rich Markdown Formatting:** Expressive power utilizing full Markdown schemas (`**bold**`, `*italics*`, preformatted ```code blocks```), completely cleansed of XSS vulnerabilities utilizing `DOMPurify` before rendering.
- **Dual Authentication Modes:** Native Google Auth pipeline via Firebase for absolute synchronization, alongside a zero-friction "Guest Mode" generator to keep sessions purely anonymous.

## 🛠️ Tech Stack & Architecture

### **Client (Frontend)**
- **Framework:** React + Vite (for instantaneous compilation times)
- **Styling:** Custom Vanilla CSS utilizing CSS Custom Variables mapping `[data-theme='light']` contexts, responsive media queries, and fluid animations.
- **Data Integrity:** `crypto-js` (AES 256 encryption), `marked` (Markdown processor), `dompurify` (DOM sanitizer).
- **Tooling:** `react-qr-code` for dynamic SVG matrix renders.
- **Observers:** Native `IntersectionObserver` tightly bounds payload requests for visible message read-states.

### **Server (Backend API & Sockets)**
- **Engine:** Node.js + Express.js
- **Database:** MongoDB via Mongoose (for encrypted log handling, user metadata, and read-state timestamps).
- **WebSockets:** Socket.io (Configured with isolated CORS pipelines).
- **Security Middlewares:** 
  - `Helmet` (Advanced HTTP headers - conceptually applied).
  - `Cors` (Enforcing strictly allowed origin domains).

## 🚀 Local Installation & Setup

To explore or modify the project on your local machine, follow these precise configuration steps:

### 1. Clone the Repository
```bash
git clone https://github.com/hrithik18k/chupchat.git
cd chupchat
```

### 2. Configure the Backend (Server)
Navigate to the server directory and install dependencies:
```bash
cd server
npm install
```
Create a `.env` file in the `server` root directory and add:
```env
PORT=5000
MONGO_URI=your_mongodb_cluster_connection_url
```
Boot the backend server in development mode:
```bash
npm run dev
```

### 3. Configure the Frontend (Client)
Open a new terminal session, navigate to the client, and install dependencies:
```bash
cd client
npm install
```
Create a `.env` file in the `client` root directory and add your application secrets:
```env
# Encryption Architecture (Required for Crypto-js)
VITE_SECRET_KEY=generate_a_highly_secure_random_string_here

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```
Boot the frontend client application:
```bash
npm run dev
```
Navigate to `http://localhost:5173` to experience Onyx locally.

---

## 🎨 Design System

Onyx relies exclusively on custom aesthetic tokens to maintain its dual-mode luxury UI. 
- **Typefaces:** [Syne](https://fonts.google.com/specimen/Syne) (Headings) / [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Conversational flow)
- **Deep Slate (Dark Mode):** Subsurface map routed natively to `#050B18`.
- **Pure Canvas (Light Mode):** Subsurface mapping dynamically swapping to `#f1f5f9` against `#ffffff` surfaces.
- **Electric Indigo:** Action/Accent mappings routed to `#5B5FFF` and `#4f46e5`.

> **Note:** Modification to UI mechanics should be updated systematically via CSS Custom Properties located inside `App.css`.

## 🛡️ Best Security Practices
- **Never expose your MongoDB URI or Firebase private variables.**
- The `VITE_SECRET_KEY` acts as the master-key matrix for decoding all incoming encrypted payloads on the client-side. For total security during deployment, rotate this key randomly and ensure it does not leak into public version control.

## 🤝 Contributing
Contributions are absolutely welcome to help expand the telemetric capabilities of Onyx.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/hrithik18k">Hrithik</a></p>
</div>

<!-- Dummy commit timestamp: 2026-03-14 22:11:30 -->