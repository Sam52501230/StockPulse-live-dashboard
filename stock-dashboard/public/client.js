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
let holdings = {};
let initialPrices = {};
let priceHistory = {}; // Store history for sparklines: { symbol: [price1, price2, ...] }

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
        holdings = data.holdings || {};
        initialPrices = data.initialPrices || {};
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
        removeStockCard(symbol);
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

        // Capture initial price if missing (for new subscriptions during session)
        if (!initialPrices[symbol]) {
            initialPrices[symbol] = data.price;
        }

        // Update history for sparklines
        if (!priceHistory[symbol]) priceHistory[symbol] = [];
        priceHistory[symbol].push(data.price);
        if (priceHistory[symbol].length > 20) priceHistory[symbol].shift();

        updateStockCard(symbol, data, oldPrice);
    });

    updatePortfolioSummary();
    updateLastUpdateTime();
    updateEmptyState();
}

// Update Total Portfolio Value
function updatePortfolioSummary() {
    let totalValue = 0;

    subscriptions.forEach(symbol => {
        const price = priceData[symbol]?.price || 0;
        const units = holdings[symbol] || 0;
        totalValue += price * units;
    });

    const totalEl = document.getElementById('totalPortfolioValue');
    if (totalEl) {
        const oldValue = parseFloat(totalEl.textContent.replace(/[$,]/g, '')) || 0;
        totalEl.textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        // Simple color flash for portfolio
        if (totalValue > oldValue) totalEl.style.color = 'var(--color-success)';
        else if (totalValue < oldValue) totalEl.style.color = 'var(--color-danger)';

        setTimeout(() => totalEl.style.color = '', 300);
    }
}

// Handle holding input change
function handleHoldingChange(symbol, value) {
    const units = parseFloat(value) || 0;
    holdings[symbol] = units;

    // Emit to server
    if (socket) {
        socket.emit('update_holding', { symbol, units });
    }

    // Force update card to recalculate values immediately
    if (priceData[symbol]) {
        updateStockCard(symbol, priceData[symbol]);
    }
    updatePortfolioSummary();
}

// Update or create stock card
function updateStockCard(symbol, data, oldPrice) {
    const grid = document.getElementById('stockGrid');
    let card = grid.querySelector(`.stock-card[data-symbol="${symbol}"]`);

    if (!card) {
        card = createStockCard(symbol);
        grid.appendChild(card);
    }

    // Elements
    const priceEl = card.querySelector('.stock-price-large');
    const changeEl = card.querySelector('.stock-change');
    const changePercentEl = card.querySelector('.stock-change-percent');
    const sparklinePath = card.querySelector('.sparkline-path');

    // Position elements
    const unitsInput = card.querySelector('.holdings-input');
    const positionValueEl = card.querySelector('.position-value');
    const plValueEl = card.querySelector('.pl-value');

    // Flash Highlight Animation
    if (oldPrice !== undefined && oldPrice !== data.price) {
        card.classList.remove('flash-up', 'flash-down');
        void card.offsetWidth; // Trigger reflow
        if (data.price > oldPrice) {
            card.classList.add('flash-up');
        } else if (data.price < oldPrice) {
            card.classList.add('flash-down');
        }
    }

    // Update Price Text
    priceEl.textContent = `$${data.price.toFixed(2)}`;

    // Update Change Text
    const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : 'neutral';
    const changeSymbol = data.change > 0 ? '+' : '';

    changeEl.className = `stock-change ${changeClass}`;
    changeEl.textContent = `${changeSymbol}${data.change.toFixed(2)}`;

    changePercentEl.className = `stock-change-percent ${changeClass}`;
    changePercentEl.textContent = `${changeSymbol}${data.changePercent.toFixed(2)}%`;

    // Update Sparkline
    if (priceHistory[symbol]) {
        const pathD = generateSparklinePath(priceHistory[symbol]);
        sparklinePath.setAttribute('d', pathD);
        sparklinePath.setAttribute('class', `sparkline-path ${changeClass}`);
    }

    // Update Holdings & P/L
    const units = parseFloat(unitsInput.value) || 0;
    holdings[symbol] = units; // Sync state for portfolio calculation

    const positionValue = units * data.price;
    positionValueEl.textContent = `$${positionValue.toFixed(2)}`;

    // P/L Calculation
    const initialPrice = initialPrices[symbol];
    if (initialPrice && initialPrice > 0) {
        const plPercent = ((data.price - initialPrice) / initialPrice) * 100;
        const plClass = plPercent > 0 ? 'positive' : plPercent < 0 ? 'negative' : 'neutral';
        const plSymbol = plPercent > 0 ? '+' : '';
        plValueEl.textContent = `${plSymbol}${plPercent.toFixed(2)}%`;
        plValueEl.className = `pl-value ${plClass}`;
    } else {
        plValueEl.textContent = '0.00%';
        plValueEl.className = 'pl-value neutral';
    }
}

// Create new stock card
function createStockCard(symbol) {
    const card = document.createElement('div');
    card.className = 'stock-card';
    card.setAttribute('data-symbol', symbol);

    // Default to 10 units if not set
    const initialHolding = holdings[symbol] !== undefined ? holdings[symbol] : 10;

    card.innerHTML = `
        <div class="card-header">
            <div class="stock-info">
                <h3>${symbol}</h3>
                <div class="stock-name">${STOCK_NAMES[symbol] || symbol}</div>
            </div>
            <div class="stock-icon">${symbol.substring(0, 2)}</div>
        </div>
        
        <div class="price-section">
            <div class="stock-price-large">--</div>
            <div class="price-change-wrapper">
                <div class="stock-change neutral">--</div>
                <div class="stock-change-percent neutral">--</div>
            </div>
        </div>

        <div class="sparkline-container">
            <svg class="sparkline-svg" preserveAspectRatio="none">
                <path class="sparkline-path neutral" d="" />
            </svg>
        </div>

        <div class="holdings-section">
            <div class="holdings-row">
                <span class="holdings-label">Units Owned</span>
                <input type="number" class="holdings-input" value="${initialHolding}" min="0" step="1">
            </div>
            <div class="holdings-row">
                <span class="holdings-label">Position Value</span>
                <span class="holdings-value position-value">$0.00</span>
            </div>
            <div class="holdings-row">
                <span class="holdings-label">Total P/L</span>
                <span class="holdings-value pl-value">0.00%</span>
            </div>
        </div>
    `;

    // Add event listener for holdings input
    const input = card.querySelector('.holdings-input');
    input.addEventListener('input', (e) => {
        handleHoldingChange(symbol, e.target.value);
    });

    return card;
}

// Generate SVG Path for Sparkline
function generateSparklinePath(prices) {
    if (!prices || prices.length < 2) return '';

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1; // Avoid division by zero
    const height = 60;
    const width = 100; // virtual width units
    const step = width / (prices.length - 1);

    // Map prices to points (invert Y because SVG coords go down)
    const points = prices.map((price, i) => {
        const x = i * step;
        const normalizedY = (price - min) / range;
        const y = height - (normalizedY * height);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
}

// Remove stock card
function removeStockCard(symbol) {
    const grid = document.getElementById('stockGrid');
    const card = grid.querySelector(`.stock-card[data-symbol="${symbol}"]`);
    if (card) {
        card.remove();
    }
    delete priceData[symbol];
    delete priceHistory[symbol];
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
    const grid = document.getElementById('stockGrid');
    const emptyState = document.getElementById('emptyState');

    if (subscriptions.size === 0) {
        if (grid) grid.style.display = 'none';
        if (emptyState) emptyState.classList.add('visible');
    } else {
        if (grid) grid.style.display = 'grid';
        if (emptyState) emptyState.classList.remove('visible');
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
