const io = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('login', 'test_user@example.com');
});

socket.on('login_success', (data) => {
    console.log('Login successful:', data.email);
    console.log('Initial Prices present?', !!data.initialPrices);

    // Simulate re-login (existing user path)
    setTimeout(() => {
        console.log('Disconnecting and reconnecting...');
        socket.disconnect();

        const socket2 = io('http://localhost:3000');
        socket2.on('connect', () => {
            socket2.emit('login', 'test_user@example.com');
        });
        socket2.on('login_success', (data2) => {
            console.log('Re-login successful:', data2.email);
            console.log('Initial Prices preserved?', !!data2.initialPrices);
            process.exit(0);
        });
    }, 1000);
});

socket.on('disconnect', () => {
    console.log('Disconnected');
});
