const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import WebSocket servers
require('./data/hyperliquid_server');
require('./data/lighter_server');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Make io available globally for our data aggregator
global.io = io;

io.on('connection', (socket) => {
    console.log('[SERVER] Client connected');
    
    // Send test message to verify connection
    socket.emit('test', { message: 'Connection established' });
    
    socket.on('disconnect', () => {
        console.log('[SERVER] Client disconnected');
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`[SERVER] WebSocket server running on port ${PORT}`);
    console.log('[SERVER] Waiting for frontend connection...');
}); 