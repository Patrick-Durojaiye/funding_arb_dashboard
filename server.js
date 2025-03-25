const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const next = require('next');

// Setup Next.js app
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

// Import WebSocket logic
require('./data/hyperliquid_server');
require('./data/lighter_server');

const frontendUrl = process.env.FRONTEND_URL || '*';
const port = process.env.PORT || 3000;

nextApp.prepare().then(() => {
    const app = express();
    const server = http.createServer(app);

    console.log('[SERVER] Frontend URL:', frontendUrl);
    console.log('[SERVER] Environment:', process.env.NODE_ENV);

    // Enable CORS
    app.use(cors({
        origin: frontendUrl,
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true
    }));

    // WebSocket server
    const io = new Server(server, {
        path: 'socket.io',
        cors: {
            origin: [frontendUrl],
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket','polling'],
        pingTimeout: 60000,
        pingInterval: 25000
    });

    global.io = io;

    io.on('connection', (socket) => {
        console.log('[SERVER] Client connected. ID:', socket.id);
        console.log('[SERVER] Transport used:', socket.conn.transport.name);
        console.log('[SERVER] Handshake:', socket.handshake.headers.origin);

        socket.emit('test', { message: 'Connection established' });

        socket.on('disconnect', (reason) => {
            console.log('[SERVER] Client disconnected. ID:', socket.id, 'Reason:', reason);
        });

        socket.on('error', (error) => {
            console.error('[SERVER] Socket error:', error);
        });
    });

    io.engine.on('connection_error', (err) => {
        console.error('[SERVER] Connection error:', err);
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Next.js handles all other routes
    app.all('*', (req, res) => handle(req, res));

    // Start server
    server.listen(port, () => {
        console.log(`[SERVER] Server running on port ${port}`);
        console.log('[SERVER] Ready to serve frontend + WebSocket');
    });
});
