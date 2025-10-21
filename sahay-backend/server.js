// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors'); // Import cors

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(cors()); // Enable CORS for all origins (for development)
app.use(express.static(path.join(__dirname, '../sahay-frontend/dist'))); // Serve built React app later

wss.on('connection', (ws) => {
    console.log('Client connected via WebSocket');

    ws.on('message', (message) => {
        if (message instanceof Buffer) {
        // Received binary data (likely audio blob from client)
            console.log(`Received audio buffer chunk, size: ${message.length}`);
        // TODO: Forward this buffer to Google Speech-to-Text Streaming API
        // recognizeStream.write(message); // If STT stream is set up

        } else {
        // Received text data (likely JSON)
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log('Received JSON:', parsedMessage);

                if (parsedMessage.type === 'user_click') {
                    console.log('User click received:', parsedMessage);
                // TODO: Store click, trigger verification later (Step 13)
                // verifyUserAction(connectionId, ws, parsedMessage);
                } else {
                    console.log('Received unknown JSON:', parsedMessage);
                }

            } catch (e) {
                console.log("Received non-JSON text message:", message.toString());
            }
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket Error:', error);
    });

    ws.send(JSON.stringify({ type: 'status', message: 'Welcome! Connected to SAHAY server.' }));
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});