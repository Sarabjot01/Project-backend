const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const config = require('../config');
const router = express.Router();

router.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();

  // Start Media Stream
  twiml.connect().stream({
    url: `wss://${config.serverUrl.replace('http://', '')}/media`,
  });

  twiml.say('Welcome to the ChatGPT assistant. Please speak your query.');
  res.type('text/xml');
  res.send(twiml.toString());
});

module.exports = router;