const WebSocket = require('ws');

function startWebSocketServer() {
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
      console.log('Received:', message);
      ws.send(`Echo: ${message}`);
    });
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  console.log('WebSocket server started on port 8080');
}

module.exports = { startWebSocketServer };