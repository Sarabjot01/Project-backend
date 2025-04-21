require('dotenv').config();

module.exports = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  deepgram: {
    apiKey: process.env.DEEPGRAM_API_KEY,
  },
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/twilio_chatgpt',
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
};