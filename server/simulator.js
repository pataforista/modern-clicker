const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3001';
const socket = io(SERVER_URL);

const POSSIBLE_ANSWERS = ['A', 'B', 'C', 'D', 'E'];
const NUM_CLICKERS = 30;
const CLICKER_IDS = Array.from({ length: NUM_CLICKERS }, (_, i) => \`ID_\${1000 + i}\`);

console.log('Starting Clicker Simulator...');

socket.on('connect', () => {
  console.log('Connected to server! Sending random votes every 500ms...');
  
  setInterval(() => {
    const id = CLICKER_IDS[Math.floor(Math.random() * CLICKER_IDS.length)];
    const response = POSSIBLE_ANSWERS[Math.floor(Math.random() * POSSIBLE_ANSWERS.length)];
    
    socket.emit('simulate_vote', {
        id: id,
        response: response,
        timestamp: Date.now()
    });
    
    console.log(\`Sent: \${id} -> \${response}\`);
  }, 500);
});
