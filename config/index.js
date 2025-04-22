require('dotenv').config();

if (!process.env.MONGO_URL) {
  throw new Error('MONGO_URL is not defined in .env file');
}

module.exports = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  mongoUrl: process.env.MONGO_URL,
  serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
};