<div align="center">

# 🔒 [ChupChat](https://chupchat-1.onrender.com/)
**Enterprise-Grade Secure & Encrypted Real-Time Chat**

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

**ChupChat** is an advanced, premium-tier real-time chat application engineered for privacy, security, and elegance. Built entirely on the MERN stack with highly scaled WebSockets, it leverages military-grade AES encryption to guard its messages and pairs it with an aggressively minimal, luxury dark glassmorphism interface. 

It is designed to give users a pristine, ad-free environment where text data remains inherently their own.

## ✨ Key Features

- **End-to-End Encryption (AES):** All chat messages are encrypted and decrypted strictly on the client-side utilizing Crypto-js. The server never reads the plain-text message contents.
- **Micro-Room Architecture:** Create independent, transient terminal channels protected entirely by unique 4-8 character IDs and strict 4-digit PINs. 
- **Frictionless QR Auto-Join:** Generate a secure, room-specific QR code natively within any chat. When a participant scans it with a mobile device, they instantaneously bypass the lobby via parametric URL decoding (`/?room=X&pwd=Y`).
- **Rich Markdown Formatting:** Expressive power utilizing full Markdown schemas (`**bold**`, `*italics*`, lists, preformatted ```code blocks```), aggressively cleansed of XSS vulnerabilities utilizing `DOMPurify` before DOM painting.
- **Enterprise UI Experience:** Fully responsive layout modeled after top-tier B2B environments. Built specifically with *WhatsApp/Telegram*-style bubble messaging mechanics, integrated mobile edge-swipes, and crisp *Syne & DM Sans* typography hierarchies.
- **Real-Time Presence Metrics:** Low-latency Socket.io hooks delivering exact states on active room participants, real-time typing bubble animations (dot physics), and system-level join/leave toasts.
- **Dual Authentication Modes:** Native Google Auth pipeline via Firebase for absolute synchronization, alongside a zero-friction "Guest" login mode to keep sessions purely anonymous.

## 🛠️ Tech Stack & Architecture

### **Client (Frontend)**
- **Framework:** React + Vite (for instantaneous compilation times)
- **Styling:** Custom Vanilla CSS utilizing advanced Glassmorphism CSS architecture, CSS Custom Variables, nested hierarchy scaling, and backdrop dynamic blurring.
- **Data Integrity:** `Crypto-js` (AES 256 processing), `marked` (Markdown compiler), `dompurify` (DOM sanitizer).
- **Tooling:** `react-qr-code` for dynamic SVG matrix renders.

### **Server (Backend API & Sockets)**
- **Engine:** Node.js + Express.js
- **Database:** MongoDB via Mongoose (for encrypted log handling & user metadata tracking).
- **WebSockets:** Socket.io (Configured with isolated CORS pipelines).
- **Security Middlewares:** 
  - `Helmet` (Advanced HTTP headers).
  - `Express-Rate-Limit` (Prevents aggressive DDoS or Brute-force socket connections).
  - `Cors` (Enforcing strictly allowed origin domains).

## 🚀 Local Installation & Setup

To explore or modify the project on your local machine, follow these precise configuration steps:

### 1. Clone the Repository
```bash
git clone https://github.com/hrithik18k/chupchat.git
cd chupchat
```

### 2. Configure the Backend (Server)
```bash
cd server
npm install
```
Create a `.env` file in the `server` root directory and add:
```env
PORT=3000
MONGODB_URI=your_mongodb_cluster_connection_url
CLIENT_URL=http://localhost:5173
```
Next, boot the server:
```bash
npm run dev
```

### 3. Configure the Frontend (Client)
Open a new terminal session.
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
Navigate to `http://localhost:5173` to experience ChupChat locally.

---

## 🎨 Design System

ChupChat relies exclusively on custom aesthetic tokens to maintain its luxury flat-dark UI. 
- **Typefaces:** [Syne](https://fonts.google.com/specimen/Syne) (Architecture & Headings) / [DM Sans](https://fonts.google.com/specimen/DM+Sans) (Conversational flow)
- **Deep Slate:** Subsurface `var(--bg-base)` mapped natively to `#050B18`.
- **Electric Indigo:** Action/Accent mappings `var(--accent-primary)` routed to `#5B5FFF`.

> **Note:** Modification to UI mechanics should be updated systematically via CSS Custom Properties located inside `index.css` or `App.css`.

## 🛡️ Best Security Practices
- **Never expose your MongoDB URI or Firebase private variables.**
- Ensure that the rendering engine uses `httpOnly` flags when escalating beyond the development server environment.
- The `VITE_SECRET_KEY` acts as the master-key matrix for decoding all incoming arrays. For total security during deployment, rotate this key randomly and ensure it does not leak directly inside `.jsx` files without the `import.meta.env` abstraction layer.

## 🤝 Contributing
Contributions are absolutely welcome.
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

<div align="center">
  <p>Built with ❤️ by <a href="https://github.com/hrithik18k">Hrithik</a></p>
</div>
