// StockPulse Dashboard Client

const STOCK_NAMES = {
    GOOG: 'Alphabet Inc.',
    TSLA: 'Tesla Inc.',
    AMZN: 'Amazon.com Inc.',
    META: 'Meta Platforms Inc.',
    NVDA: 'NVIDIA Corporation'
};

let socket = null;
let currentUser = null;
let subscriptions = new Set();
let priceData = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeSocket();
    setupEventListeners();
});

// Check authentication
function checkAuth() {
    const storedUser = localStorage.getItem('stockpulse_user');
    if (!storedUser) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = storedUser;
    updateUserDisplay();
}

// Update user display
function updateUserDisplay() {
    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');

    if (emailEl) emailEl.textContent = currentUser;
    if (avatarEl) avatarEl.textContent = currentUser.charAt(0).toUpperCase();
}

// Initialize Socket.io connection
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus('connected');
        socket.emit('login', currentUser);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus('disconnected');
    });

    socket.on('login_success', (data) => {
        console.log('Login successful', data);
        subscriptions = new Set(data.subscriptions);
        renderSubscriptionList(data.availableStocks);
        updateActiveCount();
    });

    socket.on('price_update', (prices) => {
        handlePriceUpdate(prices);
    });
}

// Update connection status indicator
function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = statusEl.querySelector('.status-text');

    statusEl.classList.remove('connected', 'disconnected');
    statusEl.classList.add(status);

    if (status === 'connected') {
        statusText.textContent = 'Live';
    } else {
        statusText.textContent = 'Disconnected';
    }
}

// Render subscription list
function renderSubscriptionList(stocks) {
    const listEl = document.getElementById('subscriptionList');
    listEl.innerHTML = '';

    stocks.forEach(symbol => {
        const item = document.createElement('div');
        item.className = 'subscription-item';
        if (subscriptions.has(symbol)) {
            item.classList.add('active');
        }

        item.innerHTML = `
      <label class="subscription-checkbox">
        <input type="checkbox" ${subscriptions.has(symbol) ? 'checked' : ''} data-symbol="${symbol}">
        <span class="checkmark"></span>
      </label>
      <div class="subscription-info">
        <div class="subscription-symbol">${symbol}</div>
        <div class="subscription-name">${STOCK_NAMES[symbol] || symbol}</div>
      </div>
    `;

        const checkbox = item.querySelector('input');
        checkbox.addEventListener('change', (e) => {
            handleSubscriptionChange(symbol, e.target.checked);
        });

        listEl.appendChild(item);
    });
}

// Handle subscription change
function handleSubscriptionChange(symbol, isChecked) {
    if (isChecked) {
        subscriptions.add(symbol);
        socket.emit('subscribe', symbol);
    } else {
        subscriptions.delete(symbol);
        socket.emit('unsubscribe', symbol);
        removePriceRow(symbol);
    }

    updateActiveCount();
    updateSubscriptionItemState(symbol, isChecked);
    updateEmptyState();
}

// Update subscription item visual state
function updateSubscriptionItemState(symbol, isActive) {
    const items = document.querySelectorAll('.subscription-item');
    items.forEach(item => {
        const checkbox = item.querySelector(`input[data-symbol="${symbol}"]`);
        if (checkbox) {
            if (isActive) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        }
    });
}

// Update active subscription count
function updateActiveCount() {
    const countEl = document.getElementById('activeCount');
    if (countEl) {
        countEl.textContent = subscriptions.size;
    }
}

// Handle price updates
function handlePriceUpdate(prices) {
    Object.entries(prices).forEach(([symbol, data]) => {
        if (!subscriptions.has(symbol)) return;

        const oldPrice = priceData[symbol]?.price;
        priceData[symbol] = data;

        updatePriceRow(symbol, data, oldPrice);
    });

    updateLastUpdateTime();
    updateEmptyState();
}

// Update or create price table row
function updatePriceRow(symbol, data, oldPrice) {
    const tbody = document.getElementById('pricesTableBody');
    let row = tbody.querySelector(`tr[data-symbol="${symbol}"]`);

    if (!row) {
        row = createPriceRow(symbol);
        tbody.appendChild(row);
    }

    const priceCell = row.querySelector('.stock-price');
    const changeCell = row.querySelector('.stock-change');
    const percentCell = row.querySelector('.stock-change-percent');
    const timeCell = row.querySelector('.stock-time');

    // Update price with flash animation
    if (oldPrice !== undefined && oldPrice !== data.price) {
        priceCell.classList.remove('flash-up', 'flash-down');
        void priceCell.offsetWidth; // Trigger reflow
        if (data.price > oldPrice) {
            priceCell.classList.add('flash-up');
        } else if (data.price < oldPrice) {
            priceCell.classList.add('flash-down');
        }
    }

    priceCell.textContent = `$${data.price.toFixed(2)}`;

    // Update change
    const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : 'neutral';
    const changeSymbol = data.change > 0 ? '+' : '';

    changeCell.className = `stock-change ${changeClass}`;
    changeCell.textContent = `${changeSymbol}${data.change.toFixed(2)}`;

    percentCell.className = `stock-change-percent ${changeClass}`;
    percentCell.textContent = `${changeSymbol}${data.changePercent.toFixed(2)}%`;

    // Update time
    const time = new Date(data.lastUpdate);
    timeCell.textContent = time.toLocaleTimeString();
}

// Create new price table row
function createPriceRow(symbol) {
    const row = document.createElement('tr');
    row.setAttribute('data-symbol', symbol);

    row.innerHTML = `
    <td>
      <div class="stock-symbol">
        <div class="symbol-icon">${symbol.substring(0, 2)}</div>
        <span>${symbol}</span>
      </div>
    </td>
    <td class="stock-price">--</td>
    <td class="stock-change neutral">--</td>
    <td class="stock-change-percent neutral">--</td>
    <td class="stock-time">--</td>
  `;

    return row;
}

// Remove price row
function removePriceRow(symbol) {
    const tbody = document.getElementById('pricesTableBody');
    const row = tbody.querySelector(`tr[data-symbol="${symbol}"]`);
    if (row) {
        row.remove();
    }
    delete priceData[symbol];
}

// Update last update time
function updateLastUpdateTime() {
    const timeEl = document.getElementById('lastUpdateTime');
    if (timeEl) {
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString();
    }
}

// Update empty state visibility
function updateEmptyState() {
    const table = document.getElementById('pricesTable');
    const emptyState = document.getElementById('emptyState');

    if (subscriptions.size === 0) {
        table.classList.add('hidden');
        emptyState.classList.add('visible');
    } else {
        table.classList.remove('hidden');
        emptyState.classList.remove('visible');
    }
}

// Setup event listeners
function setupEventListeners() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('stockpulse_user');
    if (socket) {
        socket.disconnect();
    }
    window.location.href = 'index.html';
}
