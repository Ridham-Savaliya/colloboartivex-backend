import express from 'express';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import { setupSocket } from './socket'; // For collaborate/lobby sync
import setUpVideoSignalling from './signaling/signaling';
import { setupWhiteboard } from './whiteboard'; // For whiteboard sync

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);

// Enable CORS for client domain
app.use(cors({
  origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH'],
  credentials: true
}));

app.use('/ice-config', require('./routes/ice-config')); // Note: This line still uses require due to mixed module types

// Enable JSON parsing middleware
app.use(express.json());

// Initialize WebSocket server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true
  }
});
const whiteboardNamespace = io.of('/whiteboard');
const collaborateNamespace = io.of('/collaborate');


setupWhiteboard(whiteboardNamespace); // Whiteboard real-time sync
setupSocket(collaborateNamespace, io); // Lobby/user management with io instance
setUpVideoSignalling(io); // Video call signaling

// Root route
app.get('/', (_, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>CollaborativeX Whiteboard API</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-direction: column; height: 100vh; color: #1f2937; padding: 0 1rem; }
        h1 { color: #7c3aed; font-size: 2.5rem; margin-bottom: 0.5rem; }
        p { font-size: 1rem; }
        .info { margin-top: 1.5rem; text-align: center; }
        a { color: #7c3aed; text-decoration: none; font-weight: 500; }
      </style>
    </head>
    <body>
      <h1>🧠 CollaborativeX Whiteboard API</h1>
      <p>Real-time drawing, video calling, and AI features.</p>
      <div class="info">
        <p>Status: ✅ Running</p>
        <p><a href="/home">Try /home route</a></p>
        <p><a href="https://github.com/Ridham-Savaliya/colloboartivex-backend" target="_blank">GitHub Repository</a></p>
      </div>
    </body>
    </html>
  `);
});

// Fancy /home route
app.get("/home", (_, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>CollaborativeX Backend</title>
      <style>
        :root { --purple-dark: #4c1d95; --purple: #6d28d9; --purple-light: #c4b5fd; --text: #f5f5f5; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(145deg, var(--purple-dark), var(--purple)); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center; padding: 0 1rem; }
        h1 { font-size: 3rem; color: var(--purple-light); }
        p { font-size: 1.2rem; color: #e0d8f9; margin: 1rem 0; }
        .badge { background-color: var(--text); color: var(--purple-dark); padding: 0.5rem 1.2rem; border-radius: 30px; font-weight: bold; }
        .links { margin-top: 2rem; }
        .links a { color: var(--purple-light); text-decoration: none; margin: 0 0.8rem; font-weight: 500; }
        .links a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <h1>🧠 CollaborativeX Backend</h1>
      <p>Powering real-time sync, video calls, and AI magic on your whiteboard.</p>
      <div class="badge">🚀 Server is Live</div>
      <div class="links">
        <a href="/">Go to Root</a>
        <a href="https://github.com/Ridham-Savaliya/colloboartivex-backend" target="_blank">GitHub</a>
        <a href="/api/board">Board API</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (_, res) => {
  res.send('OK');
});

setInterval(() => {
  fetch('https://collaboartivex-backend-jb9j.onrender.com/health')
    .then(() => console.log('🔁 Self-ping successful'))
    .catch(() => console.log('❌ Self-ping failed'));
}, 5 * 60 * 1000); // every 5 minutes

// Fallback route
app.use((req, res) => {
  res.status(404).send("404 Not Found – Invalid route.");
});

// Start the server
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ CollaborativeX server running on port ${PORT}`);
});

export default httpServer;
