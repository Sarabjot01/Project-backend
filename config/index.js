require('dotenv').config();

const config = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },
  geminiApiKey: process.env.GEMINI_API_KEY,
  serverUrl: process.env.SERVER_URL,
  port: process.env.PORT || 3000
};

// Validate critical configuration
if (!config.twilio.accountSid || !config.twilio.authToken || !config.twilio.phoneNumber) {
  console.error('Error: Missing Twilio configuration in .env');
  process.exit(1);
}

if (!config.geminiApiKey) {
  console.error('Error: Missing GEMINI_API_KEY in .env');
  process.exit(1);
} else {
  const keyPattern = /^[A-Za-z0-9_-]{30,40}$/;
  if (!keyPattern.test(config.geminiApiKey)) {
    console.error('Error: GEMINI_API_KEY format appears invalid. Ensure it matches Google AI Studio format.');
    process.exit(1);
  }
  console.log('Gemini API Key loaded successfully');
}

if (!config.serverUrl) {
  console.error('Error: Missing SERVER_URL in .env');
  process.exit(1);
}

module.exports = config;