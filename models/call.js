const { Schema, model } = require('mongoose');

const callSchema = new Schema({
  callSid: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = model('Call', callSchema);