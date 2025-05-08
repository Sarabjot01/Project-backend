// const { VoiceResponse } = require('twilio').twiml;
// const Call = require('../models/call');
// const Conversation = require('../models/conversation');
// const { processQuery } = require('./gemini');

// async function handleGather(callSid, from, to, speechResult) {
//   const twiml = new VoiceResponse();
//   try {
//     console.log('Handling gather:', { callSid, from, to, speechResult });

//     // Process query with Gemini
//     let response;
//     try {
//       response = await processQuery(speechResult);
      
//       if(response.type === 'dial'){
//         twiml.say({ voice: 'Polly.Kajal-Neural' }, "Transferring you now...");
//         twiml.dial(response.number); 
//       }else {
//         twiml.say({ voice: 'Polly.Kajal-Neural' }, response.message);
//         twiml.pause({ length: 2 });
//         twiml.redirect('/twilio/voice');
//       }

//       console.log('Gemini response:', response.message);
//     } catch (geminiError) {
//       console.error('Gemini processing error:', geminiError.message);
//       response = 'Sorry, I couldn’t process your request. Please try again.';
//     }

//     // Save conversation with fallback
//     try {
//       const conversation = new Conversation({
//         callSid,
//         userInput: speechResult,
//         assistantResponse: response
//       });
//       await conversation.save();
//       console.log('Conversation saved:', conversation);
//     } catch (Error) {
//       console.error( 'error saving conversation:', Error.message);
//     }

//     // Clean up history with fallback
//     try {
//       const conversationCount = await Conversation.countDocuments({ callSid });
//       if (conversationCount > 20) {
//         const oldest = await Conversation.findOne({ callSid }).sort({ timestamp: 1 });
//         await Conversation.deleteOne({ _id: oldest._id });
//         console.log('Deleted oldest conversation for callSid:', callSid);
//       }
//     } catch (mongoError) {
//       console.error('MongoDB error in history cleanup:', mongoError.message);
//     }

//     //console.log('Gather TwiML:', twiml.toString());
//     return twiml.toString();
//   } catch (error) {
//     console.error('Error in handleGather:', error.message, error.stack);
//     twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
//     twiml.redirect('/twilio/voice');
//     console.log('Error TwiML:', twiml.toString());
//     return twiml.toString();
//   }
// }

// module.exports = { handleGather };
