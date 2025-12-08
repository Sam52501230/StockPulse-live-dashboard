// Main server entry point

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const socketHandler = require('./socket');
const stocks = require('./stocks');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get available stocks
app.get('/api/stocks', (req, res) => {
    res.json({
        symbols: stocks.getSymbols(),
        prices: stocks.getAllPrices()
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize socket handling
socketHandler.initialize(io);

// Start server
server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Stock Broker Dashboard Server                         ║
║                                                            ║
║   Server running at: http://localhost:${PORT}               ║
║   Available stocks: ${stocks.getSymbols().join(', ')}       
║                                                            ║
║   Open your browser to start trading!                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    socketHandler.stopPriceUpdates();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    socketHandler.stopPriceUpdates();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
