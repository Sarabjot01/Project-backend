const express = require('express');
const { MongoClient } = require('mongodb');
const twilioRoutes = require('./routes/twilio');
const config = require('./config');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with retry logic
let db;
async function connectMongoDB() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const client = await MongoClient.connect(config.mongoUrl, {
        serverSelectionTimeoutMS: 5000,
      });
      db = client.db('twilio_chatgpt');
      console.log('Connected to MongoDB');
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt} failed:`, err.message);
      if (attempt === 5) {
        console.error('Failed to connect to MongoDB after 5 attempts. Server will continue without MongoDB.');
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

connectMongoDB();

// Root route to prevent 404
app.get('/', (req, res) => {
  res.status(200).send('Twilio-ChatGPT Backend');
});

// Routes
app.use('/twilio', twilioRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mongoConnected: !!db });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});