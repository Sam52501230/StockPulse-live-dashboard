# StockPulse - Real-Time Stock Broker Dashboard

A production-ready real-time stock tracking dashboard built with Node.js, Express, Socket.io, and vanilla JavaScript.

## Features

- **Email-Only Login** - Simple authentication using email only
- **Real-Time Updates** - Live stock prices updated every second via WebSockets
- **Selective Subscriptions** - Subscribe to specific stocks (GOOG, TSLA, AMZN, META, NVDA)
- **Multi-User Support** - Multiple users can track different stocks independently
- **Persistent Sessions** - User sessions persist across page refreshes
- **Modern UI** - Glassmorphism design with smooth animations

## Tech Stack

**Backend:**
- Node.js
- Express.js
- Socket.io

**Frontend:**
- HTML5
- CSS3 (Vanilla)
- JavaScript (ES6+)
- Socket.io Client

## Installation

1. **Install dependencies:**
```bash
npm install
```

## Running the Application

**Start the server:**
```bash
npm start
```

The server will start at `http://localhost:3000`

## Testing Multi-User Functionality

The following tests were performed on the **deployed application** to verify support for multiple concurrent users and asynchronous real-time updates.

### Test Setup

Two independent user sessions were opened using different browser contexts (normal window and incognito / different browser), both accessing the same deployed application URL:


### Test Steps

**User Session 1:**
1. Open the deployed application in a browser window.
2. Log in using:
   - Email: `user1@example.com`
3. Subscribe to the following stocks:
   - GOOG
   - TSLA

**User Session 2:**
1. Open the deployed application in a separate browser session.
2. Log in using:
   - Email: `user2@example.com`
3. Subscribe to the following stocks:
   - AMZN
   - META
   - NVDA

### Verification

- User 1’s dashboard displays only GOOG and TSLA with live price updates.
- User 2’s dashboard displays only AMZN, META, and NVDA with live price updates.
- Both dashboards update automatically in real time without requiring a page refresh.
- Stock prices update asynchronously while both sessions remain open, demonstrating real-time data synchronization across multiple clients.

### Subscription Change Test

1. In User 1’s session, unsubscribe from GOOG.
2. Verify that GOOG is immediately removed and stops updating for User 1.
3. Verify that User 2’s dashboard remains unaffected.
4. Re-subscribe to GOOG in User 1’s session and confirm that live updates resume instantly.

### Reconnection Test

1. Refresh the browser in User 1’s session.
2. Verify that the user remains authenticated.
3. Confirm that previously selected stock subscriptions are restored.
4. Verify that real-time price updates continue without interruption.



## Project Structure

```
stock-dashboard/
├── server/
│   ├── index.js          # Main server entry point
│   ├── socket.js         # Socket.io event handlers
│   ├── stocks.js         # Stock price generator
│   └── users.js          # User subscription management
├── public/
│   ├── index.html        # Login page
│   ├── dashboard.html    # Main dashboard
│   ├── styles.css        # Complete styling
│   └── client.js         # Client-side logic
├── package.json
└── README.md
```

## API Endpoints

### HTTP Endpoints

- `GET /` - Serves login page
- `GET /dashboard.html` - Serves dashboard page
- `GET /api/stocks` - Returns available stocks and current prices
- `GET /api/health` - Health check endpoint

### Socket.io Events

**Client → Server:**
- `login` - User login with email
- `subscribe` - Subscribe to a stock symbol
- `unsubscribe` - Unsubscribe from a stock symbol
- `update_subscriptions` - Bulk update subscriptions

**Server → Client:**
- `login_success` - Login confirmation with user data
- `price_update` - Real-time price updates (personalized per user)

## How It Works

### Price Generation
- Each stock starts with a realistic base price
- Prices update every 1 second with random delta: `price += (Math.random() - 0.5) * 2`
- Changes are calculated as absolute and percentage values

### User Management
- Users stored in-memory with email as key
- Each user has a socket ID and subscription set
- Subscriptions persist when user reconnects
- Socket ID updates on reconnection

### Real-Time Updates
- Server generates new prices every second
- For each active user, server filters prices by their subscriptions
- Only subscribed stock prices are sent to each user
- Updates are personalized and independent per user

### Session Persistence
Authentication state is managed by Firebase Authentication.
User sessions persist across page reloads using Firebase's secure token-based session handling.
On page load, the application automatically restores the authenticated session and redirects the user to the dashboard.
User subscriptions and portfolio data are persisted in Firestore and restored on login.


### Configuration
The application is deployed as a hosted web service.
In production environments, the server binds to the port provided by the hosting platform via environment variables.
No manual port configuration is required for deployed usage.


## Supported Stocks

- **GOOG** - Alphabet Inc.
- **TSLA** - Tesla Inc.
- **AMZN** - Amazon.com Inc.
- **META** - Meta Platforms Inc.
- **NVDA** - NVIDIA Corporation

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

### Performance

Stock prices are updated at 1-second intervals using real-time database listeners.
The application is designed to support multiple concurrent users with minimal client-side overhead.
Performance testing was conducted in a browser-based environment with multiple simultaneous sessions.


