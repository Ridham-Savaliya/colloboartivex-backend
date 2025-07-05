# 🧠 Collaborative Whiteboard Backend

This is the **backend service** for a **real-time collaborative whiteboard** application. It enables **multiple users to collaborate simultaneously** using advanced features like:

- ✍️ Real-time drawing and whiteboard synchronization
- 📹 Video calling
- 🧠 AI features (e.g. shape recognition)
- ✉️ Email invitations to collaborators
- 📡 WebSocket-powered bi-directional communication

---

## 🚀 Features

- 🔄 **Real-time Sync:** Seamless updates across all users via WebSockets
- 👥 **Multi-user Collaboration:** Multiple users can draw and interact on the same board
- 📞 **Video Calling Integration:** Peer-to-peer communication support
- 🧠 **AI Enhancements:** Shape detection and future AI-assisted drawing tools
- ✉️ **Email Invitations:** Send invitation links via email using NodeMailer
- 🔒 **Secure Architecture:** Robust user validation, room access control
- 💪 **Scalable Design:** Built for performance and flexibility

---

## 🧪 Tech Stack

| Category       | Technology         |
| -------------- | ------------------ |
| Language       | TypeScript         |
| Runtime        | Node.js            |
| Framework      | Express.js         |
| Realtime Layer | WebSockets (ws)    |
| Database       | MongoDB + Mongoose |
| Email Service  | NodeMailer         |
| Others         | Dotenv, CORS, etc. |

---

## 📁 Project Structure

```
├── src/
│   ├── controllers/       # Route logic
│   ├── routes/            # API route handlers
│   ├── sockets/           # WebSocket event handling
│   ├── models/            # Mongoose schemas
│   ├── utils/             # Utility functions (e.g., email sender)
│   ├── config/            # Environment and DB setup
│   ├── index.ts           # Entry point
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/whiteboard-backend.git
cd whiteboard-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongo_connection_string
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
CLIENT_URL=http://localhost:3000
```

### 4. Run the server

#### In development (with auto-reload)

```bash
npm run dev
```

#### In production

```bash
npm run build
npm start
```

---

## 🔌 WebSocket Events

| Event Name     | Description                      |
| -------------- | -------------------------------- |
| `join-room`    | User joins a specific whiteboard |
| `sync-changes` | Broadcasts real-time updates     |
| `draw-shape`   | Adds shapes via AI recognition   |
| `disconnect`   | Handles user disconnect          |

---

## 📬 API Endpoints (Example)

| Method | Route            | Description               |
| ------ | ---------------- | ------------------------- |
| POST   | `/api/invite`    | Send invite email         |
| GET    | `/api/board/:id` | Get whiteboard data       |
| POST   | `/api/board`     | Create a new board        |
| PUT    | `/api/board/:id` | Update whiteboard content |

---

## 🚧 Upcoming Features

- 🤖 AI-powered drawing tools (auto straighten, object detection)
- 🔐 Auth system (JWT-based)
- 💬 Chat and annotations
- 🧠 More AI features with ML integration

---

## 👨‍💼 Contributing

PRs and feature suggestions are welcome! If you want to contribute:

1. Fork the repo
2. Create a branch: `git checkout -b new-feature`
3. Commit your changes: `git commit -m "Added something"`
4. Push to the branch: `git push origin new-feature`
5. Submit a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

