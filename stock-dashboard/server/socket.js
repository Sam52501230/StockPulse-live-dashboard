// Socket.io connection and event handling

const stocks = require('./stocks');
const users = require('./users');

let io = null;
let priceUpdateInterval = null;

// Initialize Socket.io
function initialize(socketIo) {
    io = socketIo;

    io.on('connection', (socket) => {
        console.log(`[Socket] New connection: ${socket.id}`);

        // Handle user login
        socket.on('login', (email) => {
            const user = users.registerUser(email, socket.id);
            console.log(`[Socket] User logged in: ${email} (${socket.id})`);

            // Send available stocks and current subscriptions
            socket.emit('login_success', {
                email: user.email,
                subscriptions: user.subscriptions,
                availableStocks: stocks.getSymbols()
            });

            // Send initial prices for subscribed stocks
            if (user.subscriptions.length > 0) {
                const initialPrices = {};
                user.subscriptions.forEach(symbol => {
                    initialPrices[symbol] = stocks.getPrice(symbol);
                });
                socket.emit('price_update', initialPrices);
            }
        });

        // Handle subscription changes
        socket.on('subscribe', (symbol) => {
            const user = users.getUserBySocketId(socket.id);
            if (user) {
                users.subscribe(user.email, symbol);
                console.log(`[Socket] ${user.email} subscribed to ${symbol}`);

                // Send immediate price update for the new subscription
                const price = stocks.getPrice(symbol);
                if (price) {
                    socket.emit('price_update', { [symbol]: price });
                }
            }
        });

        // Handle unsubscription
        socket.on('unsubscribe', (symbol) => {
            const user = users.getUserBySocketId(socket.id);
            if (user) {
                users.unsubscribe(user.email, symbol);
                console.log(`[Socket] ${user.email} unsubscribed from ${symbol}`);
            }
        });

        // Handle bulk subscription update
        socket.on('update_subscriptions', (symbols) => {
            const user = users.getUserBySocketId(socket.id);
            if (user) {
                users.updateSubscriptions(user.email, symbols);
                console.log(`[Socket] ${user.email} updated subscriptions: ${symbols.join(', ')}`);

                // Send immediate prices for all subscribed stocks
                const prices = {};
                symbols.forEach(symbol => {
                    const price = stocks.getPrice(symbol);
                    if (price) prices[symbol] = price;
                });
                if (Object.keys(prices).length > 0) {
                    socket.emit('price_update', prices);
                }
            }
        });

        // Handle disconnect
        socket.on('disconnect', () => {
            const email = users.removeUser(socket.id);
            console.log(`[Socket] Disconnected: ${socket.id}${email ? ` (${email})` : ''}`);
        });
    });

    // Start periodic price updates
    startPriceUpdates();
}

// Start sending price updates every second
function startPriceUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }

    priceUpdateInterval = setInterval(() => {
        // Update all stock prices
        const allPrices = stocks.updateAllPrices();

        // Get all active users
        const activeUsers = users.getActiveUsers();

        // Send personalized updates to each user
        activeUsers.forEach(user => {
            if (user.subscriptions.length === 0) return;

            const userPrices = {};
            user.subscriptions.forEach(symbol => {
                if (allPrices[symbol]) {
                    userPrices[symbol] = allPrices[symbol];
                }
            });

            if (Object.keys(userPrices).length > 0 && user.socketId) {
                io.to(user.socketId).emit('price_update', userPrices);
            }
        });
    }, 1000);
}

// Stop price updates
function stopPriceUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
    }
}

module.exports = {
    initialize,
    startPriceUpdates,
    stopPriceUpdates
};
