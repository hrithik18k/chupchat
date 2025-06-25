# 🗨️ ChupChat – Secure Real-Time Encrypted Chat Rooms

### 🔗 **Frontend:** [https://your-chupchat-frontend-url.com](https://chupchat-1.onrender.com)
🔗 **Backend:** [https://chupchat.onrender.com](https://chupchat.onrender.com)

---

## 📌 Overview

**ChupChat** is a privacy-first real-time chat application where users can securely communicate in encrypted chat rooms. It features **end-to-end encryption**, **Google OAuth**, and **guest access**, providing a modern and secure messaging experience with a sleek glassmorphism UI.

---

## 🚀 Key Features

* 🔐 **Google & Guest Login** – Sign in with Google or anonymously as a guest.
* 🏠 **Room-Based Chat** – Join or create rooms with optional password protection.
* 🧠 **End-to-End Encryption** – AES-encrypted messages handled on the client side using CryptoJS.
* ⚡ **Real-Time Messaging** – Powered by Socket.io for instant updates.
* 👥 **Online Users List** – View all active users in a room.
* ✍️ **Typing Indicators** – See when other users are typing.
* 💎 **Modern UI** – Responsive design with stylish glassmorphism effects.

---

## 🛠️ Tech Stack

| Frontend         | Backend                       | Authentication        | Hosting           |
| ---------------- | ----------------------------- | --------------------- | ----------------- |
| React.js (Vite)  | Node.js, Express.js           | Firebase Google OAuth | Render            |
| Socket.io-client | Socket.io, MongoDB (Mongoose) | Guest Mode            | Vercel (optional) |
| Firebase Auth    | CryptoJS (AES Encryption)     |                       |                   |

---

## 📅 Capstone Development Plan

### Week 1: Planning & Setup

* Define requirements, user stories, and system architecture.
* Design wireframes and initialize the GitHub repo & project folder.

### Week 2: Backend Development

* Set up Express server and MongoDB connection.
* Implement Socket.io for real-time features.
* Develop APIs for room management and message handling.
* Integrate user authentication logic.

### Week 3: Frontend Development (Part 1)

* Scaffold React app with Vite.
* Implement Google and guest login.
* Build UI for joining/creating chat rooms.

### Week 4: Frontend Development (Part 2)

* Integrate Socket.io-client for live chat.
* Implement AES encryption with CryptoJS.
* Show online users and typing indicators.

### Week 5: Testing & Debugging

* Test backend APIs and real-time socket events.
* Conduct UI/UX testing, fix bugs, and optimize performance.

### Week 6: Deployment & Documentation

* Deploy frontend & backend to Render.
* Set up production environment variables.
* Finalize documentation and submit capstone report.

---

## ⚙️ Installation & Setup

### 🖥 Backend Setup

```bash
cd server
npm install
npm run dev
```

### 🌐 Frontend Setup

```bash
cd client
npm install
npm run dev
```
---

## 🤝 Contributing

We welcome contributions!
Feel free to open **issues** for bugs or ideas and **pull requests** to enhance the app.

---



