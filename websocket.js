const WebSocket = require('ws');
const { processQuery } = require('./services/openai');

function startWebSocketServer() {
  const wss = new WebSocket.Server({ port: 8080 });

  wss.on('connection', (ws) => {
    console.log('WebSocket connection established');

    ws.on('message', async (message) => {
      const data = JSON.parse(message);

      if (data.event === 'media') {
        // Simulate Deepgram transcription (replace with actual Deepgram integration)
        const transcribedText = Buffer.from(data.media.payload, 'base64').toString('utf8');
        console.log('Transcribed:', transcribedText);

        // Process with ChatGPT
        const response = await processQuery(transcribedText);

        // Send response back (requires TTS for audio)
        ws.send(JSON.stringify({
          event: 'media',
          streamSid: data.streamSid,
          media: { payload: Buffer.from(response).toString('base64') },
        }));
      }
    });

    ws.on('close', () => console.log('WebSocket connection closed'));
  });

  console.log('WebSocket server running on port 8080');
}

module.exports = { startWebSocketServer };