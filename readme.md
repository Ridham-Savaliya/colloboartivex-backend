<div align="center">

# 🟣 CollaborativeX Backend 🟣

### ✨ *Powering Real-Time Collaboration with Intelligence and Speed* ✨

</div>

> This is the backend powerhouse for **CollaborativeX**, a feature-rich, real-time collaborative whiteboard application designed for seamless teamwork and creativity. This repository contains the complete server-side solution, engineered to deliver a robust and scalable experience for interactive drawing, video communication, and intelligent productivity features.

---

## 🚀 Core Features

This backend is more than just a synchronization service; it's a comprehensive platform built to support a dynamic and engaging collaborative environment.

-   ✍️ **Real-Time Whiteboard Synchronization**: At its core, the backend uses **Socket.IO** to provide instantaneous, low-latency updates for all whiteboard activities. Whether it's drawing, adding sticky notes, or manipulating shapes, every action is seamlessly broadcast to all participants.

-   👥 **Seamless Multi-User Collaboration**: Built from the ground up to support teams, the system allows multiple users to join a shared session, see each other's cursors in real-time, and contribute to the same canvas simultaneously.

-   📹 **Integrated Video Calling**: Go beyond drawing with built-in video communication. The backend includes a dedicated signaling server using **WebRTC** principles to facilitate peer-to-peer connections, allowing collaborators to talk face-to-face without leaving the whiteboard.

-   🧠 **Intelligent Productivity Modules**:
    -   **Kanban Boards**: Organize tasks and workflows directly on your whiteboard with a fully integrated Kanban board module, complete with draggable cards and customizable columns.
    -   **Mind Mapping**: Brainstorm and structure ideas with a dynamic mind mapping tool, allowing you to create and connect nodes in real-time.

-   🔒 **Secure & Authenticated Access**: User interactions are secured through **JWT (JSON Web Token)** verification for all socket connections, ensuring that only authorized users can join and contribute to a whiteboard session.

-   💾 **Persistent Storage**: All whiteboard content—including drawings, notes, Kanban boards, and mind maps—is saved to a **MongoDB** database, allowing you to return to your work at any time.

---

## 🛠️ Technology Stack

This project is built with a modern, scalable, and efficient technology stack, chosen to handle the demands of real-time applications.

| Category                  | Technology                                  | Description                                                                                             |
| ------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Core Language** | **TypeScript** | Ensures type safety and improves code quality and maintainability.                                      |
| **Runtime Environment** | **Node.js** | Provides a fast and efficient JavaScript runtime for building server-side applications.                 |
| **Web Framework** | **Express.js** | A minimal and flexible framework for building robust APIs and handling HTTP requests.                   |
| **Real-Time Communication** | **Socket.IO** | Enables low-latency, bi-directional communication between clients and the server.                       |
| **Database** | **MongoDB** with **Mongoose** | A NoSQL database offering flexibility and scalability, with elegant object modeling.                    |
| **Authentication** | **JSON Web Tokens (JWT)** | A compact, URL-safe standard for creating access tokens.                                                |
| **Video Signaling** | **WebRTC** (via Socket.IO & Xirsys)         | Facilitates peer-to-peer connections for high-quality video and audio streaming.                        |
| **Development Tools** | **tsx**, **ts-node-dev**, **dotenv** | Modern tools for a streamlined and efficient development workflow with TypeScript.                      |

---

## ⚙️ Getting Started

Follow these steps to get the backend server running locally on your machine.

### Prerequisites

-   Node.js (v18.x or higher)
-   MongoDB (local instance or a cloud URI)
-   `pnpm` (or `npm`/`yarn`)

### 1. Clone the Repository

```bash
git clone [https://github.com/Ridham-Savaliya/colloboartivex-backend.git](https://github.com/Ridham-Savaliya/colloboartivex-backend.git)
cd colloboartivex-backend
🔌 API & Socket Architecture
The backend is organized into namespaces to cleanly separate concerns between different real-time functionalities.

🔮 /whiteboard: The main namespace for all whiteboard activities, handling drawings, notes, Kanban boards, and mind maps.

🔮 /collaborate: Manages user presence and lobby synchronization.

🔮 /video: Dedicated to the signaling logic for WebRTC video calls (join-room, start-call, signal, etc.).

🤝 Contributing
We welcome contributions of all kinds! If you're looking to help, please feel free to fork the repository, make your changes, and submit a pull request.

Fork the repository.

Create a new branch (git checkout -b feature/your-amazing-feature).

Commit your changes (git commit -m 'Add some amazing feature').

Push to the branch (git push origin feature/your-amazing-feature).

Open a Pull Request.

📄 License
This project is open-source and available under the MIT License.

<div align="center">

Thank you for your interest in CollaborativeX. We're excited to see what we can build together!

</div>
