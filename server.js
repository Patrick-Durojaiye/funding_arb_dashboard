const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import WebSocket servers
require('./data/hyperliquid_server');
require('./data/lighter_server');

const app = express();
const server = http.createServer(app);

// Configure CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
console.log('[SERVER] Frontend URL:', frontendUrl);
console.log('[SERVER] Environment:', process.env.NODE_ENV || 'development');

// Configure Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: [frontendUrl, '*'],  // Allow any origin as fallback
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Enable CORS for Express
app.use(cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true
}));

// Add a health check endpoint
app.get('/', (req, res) => {
    res.send('Funding Arbitrage Server is running');
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Make io available globally for our data aggregator
global.io = io;

io.on('connection', (socket) => {
    console.log('[SERVER] Client connected. ID:', socket.id);
    console.log('[SERVER] Transport used:', socket.conn.transport.name);
    console.log('[SERVER] Handshake:', socket.handshake.headers.origin);
    
    // Send test message to verify connection
    socket.emit('test', { message: 'Connection established' });
    
    socket.on('disconnect', (reason) => {
        console.log('[SERVER] Client disconnected. ID:', socket.id, 'Reason:', reason);
    });

    socket.on('error', (error) => {
        console.error('[SERVER] Socket error:', error);
    });
});

// Error handling for socket.io server
io.engine.on('connection_error', (err) => {
    console.error('[SERVER] Connection error:', err);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '::', () => {
    console.log(`[SERVER] Server running on port ${PORT}`);
    console.log('[SERVER] Waiting for frontend connection...');
}); 