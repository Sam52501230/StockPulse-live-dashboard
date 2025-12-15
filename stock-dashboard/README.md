# StockPulse - Real-Time Stock Trading Dashboard

**Live Demo:**(https://stockpulse-live-dashboard-3.onrender.com/)

A production-ready, real-time stock tracking dashboard engineered for high-frequency updates and concurrent user sessions. Built with a performance-first approach using Node.js and WebSockets.


## 🚀 Key Features

- **Real-Time Data Streaming**: Live stock prices updated every second via persistent WebSocket connections (Socket.io).
- **Concurrent User Sessions**: Supports multiple simultaneous users with independent, asynchronous data streams.
- **Dynamic Subscriptions**: Users can subscribe/unsubscribe to specific stocks (GOOG, TSLA, AMZN, etc.) in real-time without page reloads.
- **Glassmorphism UI**: A modern, responsive interface built with vanilla CSS3 for maximum performance and browser compatibility.
- **Session Persistence**: Smart state management ensures user settings and subscriptions are saved across sessions.

## 🛠️ Technology Stack

Designed with a lightweight, dependency-free frontend and a robust event-driven backend.

### Frontend
- **Vanilla JavaScript (ES6+)**: Core logic, DOM manipulation, and state management.
- **Vanilla CSS3**: Custom responsive design without heavy frameworks.
- **HTML5**: Semantic markup.
- 
### Backend
- **Node.js**: Runtime environment.
- **Express.js**: REST API for initial static serving and health checks.
- **Socket.io**: Real-time bi-directional event-based communication.



## 🏗️ Architecture & System Design

The application follows a **Publisher-Subscriber** pattern to handle real-time data efficiently.

```
[Stock Price Generator] ---> [Event Loop] ---> [Socket.io Broadcaster]
                                                      |
                                      +---------------+---------------+
                                      |                               |
                                [Client A]                       [Client B]
                           (Sub: GOOG, TSLA)                 (Sub: NVDA, AMZN)
```

### Core Components

1.  **Price Generator (`server/stocks.js`)**
    - Simulates market volatility using localized randomization algorithms.
    - Generates atomic price updates every 1000ms.

2.  **User Manager (`server/users.js`)**
    - In-memory data structure mapping `SocketID` ↔ `UserSession`.
    - Handles subscription sets (`Set<string>`) for O(1) lookup performance.

3.  **Socket Handler (`server/socket.js`)**
    - Manages connection lifecycle (Connect, Disconnect, Reconnect).
    - Filters global price events to deliver only relevant data to each connected client.

## 📂 Project Structure

Verified, production-ready directory structure:

```
stock-dashboard/
├── server/
│   ├── index.js          # Application entry point & HTTP server
│   ├── socket.js         # WebSocket event controller
│   ├── stocks.js         # Data generation service
│   └── users.js          # Session state management
├── public/
│   ├── client.js         # Frontend controller & socket listener
│   ├── styles.css        # Custom CSS design system
│   └── dashboard.html    # Main application view
└── render.yaml           # Infrastructure-as-Code for deployment
```

## 📡 API Overview

### Real-Time Events (WebSocket)

| Event | Direction | Description |
|-------|-----------|-------------|
| `login` | Client → Server | Authenticates user session. |
| `subscribe` | Client → Server | Adds stock to data stream. |
| `price_update` | Server → Client | Pushes new price data. |

## 🔗 Live Deployment

This project is deployed on **Render** to ensure high availability and persistent WebSocket connections.

**View Live App:** (https://stockpulse-live-dashboard-3.onrender.com/)

---
*Developed by [Samudyata Madhavaranga Minasandra]*
