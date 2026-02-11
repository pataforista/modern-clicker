const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

const PORT = 3001;
const SERIAL_PATH = 'COM3'; // Update this to your correct port
const BAUD_RATE = 115200;

let port;

function connectSerial() {
    try {
        port = new SerialPort({ path: SERIAL_PATH, baudRate: BAUD_RATE });
        const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

        port.on('open', () => {
            console.log('Serial Port Connected');
            io.emit('status', { connected: true, message: 'Hardware Online' });
        });

        port.on('error', (err) => {
            console.log('Serial Error (Connect hardware!):', err.message);
        });

        parser.on('data', (data) => {
            try {
                const cleanData = data.trim();
                console.log('RX:', cleanData); // Log raw for debugging

                // Parse JSON from Arduino: {"id": "ABC1234", "key": "A", "raw_vote": "0x31"}
                const packet = JSON.parse(cleanData);

                if (packet && packet.id && packet.key) {
                    // If valid vote (key is not '?')
                    if (packet.key !== '?') {
                        io.emit('vote', {
                            id: packet.id,
                            response: packet.key,
                            timestamp: Date.now()
                        });
                    } else {
                        // It's a debug packet or unknown key
                        console.log('Unknown Key/Packet:', packet);
                    }
                }
            } catch (e) {
                // Not JSON? Maybe init message or interfering connection
                console.log('Non-JSON Data:', data);
            }
        });

    } catch (err) {
        console.log('Running in Simulator Mode');
    }
}

connectSerial();

io.on('connection', (socket) => {
    console.log('Client connected');
    socket.on('simulate_vote', (data) => io.emit('vote', data));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
