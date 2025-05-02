const { VoiceResponse } = require('twilio').twiml;
const Call = require('../models/call');
const Conversation = require('../models/conversation');
const { processQuery } = require('./gemini');

async function handleGather(callSid, from, to, speechResult) {
  const twiml = new VoiceResponse();
  try {
    console.log('Handling gather:', { callSid, from, to, speechResult });

    // Handle Call storage with fallback
    let call;
    try {
      call = await Call.findOne({ callSid });
      if (!call) {
        call = new Call({ callSid, from, to });
        await call.save();
        console.log('Call saved:', call);
      } else {
        console.log('Call found:', call);
      }
    } catch (mongoError) {
      console.error('MongoDB error in Call query:', mongoError.message);
      call = { callSid, from, to }; // Fallback to in-memory object
    }

    // Fetch conversation history with fallback
    let history = [];
    try {
      history = await Conversation.find({ callSid })
        .sort({ timestamp: 1 })
        .limit(20);
      console.log('Conversation history retrieved:', history.length, 'entries');
    } catch (mongoError) {
      console.error('MongoDB error in Conversation query:', mongoError.message);
    }

    const conversationHistory = history.map(entry => [
      { role: 'user', content: entry.userInput },
      { role: 'assistant', content: entry.assistantResponse }
    ]).flat();

    // Process query with Gemini
    let response;
    try {
      response = await processQuery(speechResult, conversationHistory);
      console.log('Gemini response:', response);
    } catch (geminiError) {
      console.error('Gemini processing error:', geminiError.message);
      response = 'Sorry, I couldn’t process your request. Please try again.';
    }

    // Save conversation with fallback
    try {
      const conversation = new Conversation({
        callSid,
        userInput: speechResult,
        assistantResponse: response
      });
      await conversation.save();
      console.log('Conversation saved:', conversation);
    } catch (mongoError) {
      console.error('MongoDB error saving conversation:', mongoError.message);
    }

    // Clean up history with fallback
    try {
      const conversationCount = await Conversation.countDocuments({ callSid });
      if (conversationCount > 20) {
        const oldest = await Conversation.findOne({ callSid }).sort({ timestamp: 1 });
        await Conversation.deleteOne({ _id: oldest._id });
        console.log('Deleted oldest conversation for callSid:', callSid);
      }
    } catch (mongoError) {
      console.error('MongoDB error in history cleanup:', mongoError.message);
    }

    twiml.say({ voice: 'Polly.Joanna-Neural' }, response);
    twiml.redirect('/twilio/voice');
    console.log('Gather TwiML:', twiml.toString());
    return twiml.toString();
  } catch (error) {
    console.error('Error in handleGather:', error.message, error.stack);
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
    twiml.redirect('/twilio/voice');
    console.log('Error TwiML:', twiml.toString());
    return twiml.toString();
  }
}

module.exports = { handleGather };
