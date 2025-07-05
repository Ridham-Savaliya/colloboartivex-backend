import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { setupSocket } from './socket';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load the env file from the root
dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH'],
    credentials:true
  }
});

setupSocket(io);
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>CollaborativeX Whiteboard API</title>
      <style>
        body {
          margin: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f7f9fc;
          color: #333;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
          height: 100vh;
        }
        h1 {
          color: #4f46e5;
          margin-bottom: 0.5rem;
        }
        p {
          margin: 0.2rem 0;
        }
        .info {
          margin-top: 1.5rem;
        }
        a {
          text-decoration: none;
          color: #4f46e5;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <h1>🧠 CollaborativeX Whiteboard API</h1>
      <p>Real-time drawing, video calling, and AI features.</p>
      <div class="info">
        <p>Status: ✅ Running</p>
        <p><a href="/home">Try /home route</a></p>
        <p><a href="https://github.com/Ridham-Savaliya/colloboartivex-backend" target="_blank">View on GitHub</a></p>
      </div>
    </body>
    </html>
  `);
});


app.get("/home", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>CollaborativeX Backend</title>
      <style>
        :root {
          --purple-dark: #4c1d95;
          --purple: #6d28d9;
          --purple-light: #c4b5fd;
          --text: #f5f5f5;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(145deg, var(--purple-dark), var(--purple));
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
          color: var(--purple-light);
        }
        p {
          font-size: 1.2rem;
          margin-bottom: 1.5rem;
          color: #e0d8f9;
        }
        .badge {
          background-color: var(--text);
          color: var(--purple-dark);
          font-weight: bold;
          padding: 0.5rem 1.2rem;
          border-radius: 30px;
          font-size: 1rem;
        }
        .links {
          margin-top: 2rem;
        }
        .links a {
          color: var(--purple-light);
          text-decoration: none;
          margin: 0 0.8rem;
          font-weight: 500;
        }
        .links a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <h1>🧠 CollaborativeX Backend</h1>
      <p>Powering real-time sync, video calls, and AI magic on your whiteboard.</p>
      <div class="badge">🚀 Server is Live</div>
      <div class="links">
        <a href="/">Go to Root</a>
        <a href="https://github.com/Ridham-Savaliya/colloboartivex-backend" target="_blank">GitHub</a>
        <a href="/api/board">API</a>
      </div>
    </body>
    </html>
  `);
});



const PORT = process.env.PORT || 3002;

httpServer.listen(PORT, () => {
  console.log(`WebSocket and Backend-server is running on port ${PORT}`)
});
