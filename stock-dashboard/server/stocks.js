// Stock price generator module

const STOCK_SYMBOLS = ['GOOG', 'TSLA', 'AMZN', 'META', 'NVDA'];

// Base prices for each stock
const BASE_PRICES = {
  GOOG: 142.50,
  TSLA: 245.80,
  AMZN: 178.25,
  META: 505.60,
  NVDA: 875.40
};

// Current prices (mutable)
const currentPrices = {};

// Initialize prices
function initializePrices() {
  STOCK_SYMBOLS.forEach(symbol => {
    currentPrices[symbol] = {
      symbol,
      price: BASE_PRICES[symbol] + (Math.random() - 0.5) * 20,
      change: 0,
      changePercent: 0,
      lastUpdate: new Date().toISOString()
    };
  });
}

// Update a single stock price
function updateStockPrice(symbol) {
  if (!currentPrices[symbol]) return null;

  const previousPrice = currentPrices[symbol].price;
  const delta = (Math.random() - 0.5) * 2;
  const newPrice = Math.max(1, previousPrice + delta);
  const change = newPrice - previousPrice;
  const changePercent = (change / previousPrice) * 100;

  currentPrices[symbol] = {
    symbol,
    price: parseFloat(newPrice.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(3)),
    lastUpdate: new Date().toISOString()
  };

  return currentPrices[symbol];
}

// Update all stock prices
function updateAllPrices() {
  const updates = {};
  STOCK_SYMBOLS.forEach(symbol => {
    updates[symbol] = updateStockPrice(symbol);
  });
  return updates;
}

// Get current price for a symbol
function getPrice(symbol) {
  return currentPrices[symbol] || null;
}

// Get all current prices
function getAllPrices() {
  return { ...currentPrices };
}

// Get supported symbols
function getSymbols() {
  return [...STOCK_SYMBOLS];
}

// Initialize on module load
initializePrices();

module.exports = {
  initializePrices,
  updateStockPrice,
  updateAllPrices,
  getPrice,
  getAllPrices,
  getSymbols,
  STOCK_SYMBOLS
};
