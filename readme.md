<div align="center">

# 🟣 CollaborativeX Backend 🟣

### ✨ *Powering Real-Time Collaboration with Intelligence and Speed* ✨

</div>

> This is the backend powerhouse for **CollaborativeX**, a feature-rich, real-time collaborative whiteboard application. This repository contains the complete server-side solution, engineered to deliver a robust and scalable experience for interactive drawing, video communication, and intelligent productivity features.

---

## 🚀 Core Features

-   ✍️ **Real-Time Whiteboard Sync**: Instantaneous, low-latency updates for all whiteboard activities using **Socket.IO**.
-   👥 **Seamless Multi-User Collaboration**: Supports multiple users on the same canvas with real-time cursor tracking.
-   📹 **Integrated Video Calling**: Built-in video communication with a dedicated **WebRTC** signaling server.
-   🧠 **Intelligent Productivity Modules**:
    -   **Kanban Boards**: Organize tasks with a fully integrated Kanban system.
    -   **Mind Mapping**: Brainstorm and structure ideas with a dynamic mind mapping tool.
-   🔒 **Secure & Authenticated Access**: All socket connections are secured with **JWT (JSON Web Token)** verification.
-   💾 **Persistent Storage**: Whiteboard content is saved to a **MongoDB** database, so you can always return to your work.

---

## 🛠️ Technology Stack

| Category                  | Technology                                  | Description                                                     |
| ------------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| **Core Language** | **TypeScript** | Ensures type safety and improves code quality.                  |
| **Runtime Environment** | **Node.js** | Provides a fast and efficient JavaScript runtime.               |
| **Web Framework** | **Express.js** | A minimal framework for building robust APIs.                   |
| **Real-Time Communication** | **Socket.IO** | Enables low-latency, bi-directional communication.              |
| **Database** | **MongoDB** with **Mongoose** | A flexible and scalable NoSQL database.                         |
| **Authentication** | **JSON Web Tokens (JWT)** | A compact, URL-safe standard for access tokens.                 |
| **Video Signaling** | **WebRTC** (via Socket.IO & Xirsys)         | Facilitates high-quality, peer-to-peer video streaming.         |
| **Development Tools** | **tsx**, **ts-node-dev**, **dotenv** | A modern toolchain for a streamlined development workflow.      |

---

## ⚙️ Getting Started

### Prerequisites
-   Node.js (v18.x or higher)
-   MongoDB (local instance or a cloud URI)
-   `pnpm` (or `npm`/`yarn`)

### 1. Clone the Repository
```bash
git clone [https://github.com/Ridham-Savaliya/colloboartivex-backend.git](https://github.com/Ridham-Savaliya/colloboartivex-backend.git)
cd colloboartivex-backend
