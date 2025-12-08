// User subscription management module

// In-memory storage for users and their subscriptions
// Format: { email: { socketId: string, subscriptions: Set<string> } }
const users = new Map();

// Socket ID to email mapping for quick lookup
const socketToEmail = new Map();

// Register or update user
function registerUser(email, socketId) {
    // Remove old socket mapping if user reconnects
    if (users.has(email)) {
        const oldSocketId = users.get(email).socketId;
        socketToEmail.delete(oldSocketId);
    }

    // Register new socket mapping
    socketToEmail.set(socketId, email);

    // Preserve subscriptions if user already exists
    const existingSubscriptions = users.has(email)
        ? users.get(email).subscriptions
        : new Set();

    users.set(email, {
        socketId,
        subscriptions: existingSubscriptions
    });

    return {
        email,
        subscriptions: Array.from(existingSubscriptions)
    };
}

// Remove user on disconnect
function removeUser(socketId) {
    const email = socketToEmail.get(socketId);
    if (email && users.has(email)) {
        users.get(email).socketId = null;
    }
    socketToEmail.delete(socketId);
    return email;
}

// Subscribe user to a stock
function subscribe(email, symbol) {
    if (!users.has(email)) return false;
    users.get(email).subscriptions.add(symbol);
    return true;
}

// Unsubscribe user from a stock
function unsubscribe(email, symbol) {
    if (!users.has(email)) return false;
    users.get(email).subscriptions.delete(symbol);
    return true;
}

// Update all subscriptions at once
function updateSubscriptions(email, symbols) {
    if (!users.has(email)) return false;
    users.get(email).subscriptions = new Set(symbols);
    return true;
}

// Get user subscriptions
function getSubscriptions(email) {
    if (!users.has(email)) return [];
    return Array.from(users.get(email).subscriptions);
}

// Get all active users with their subscriptions
function getActiveUsers() {
    const activeUsers = [];
    users.forEach((data, email) => {
        if (data.socketId) {
            activeUsers.push({
                email,
                socketId: data.socketId,
                subscriptions: Array.from(data.subscriptions)
            });
        }
    });
    return activeUsers;
}

// Get user by socket ID
function getUserBySocketId(socketId) {
    const email = socketToEmail.get(socketId);
    if (!email) return null;
    return {
        email,
        subscriptions: getSubscriptions(email)
    };
}

// Check if user is subscribed to a stock
function isSubscribed(email, symbol) {
    if (!users.has(email)) return false;
    return users.get(email).subscriptions.has(symbol);
}

module.exports = {
    registerUser,
    removeUser,
    subscribe,
    unsubscribe,
    updateSubscriptions,
    getSubscriptions,
    getActiveUsers,
    getUserBySocketId,
    isSubscribed
};
