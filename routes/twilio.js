// const express = require('express');
// const { VoiceResponse } = require('twilio').twiml;
// const twilio = require('twilio');
// const config = require('../config');
// const { processQuery, handleToolCall } = require('../services/gemini');
// const { storeConversation, queryPinecone } = require('../services/pinecone');

// const router = express.Router();
// const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);

// function containsHarmfulContent(response) {
//   const harmfulKeywords = ['harmful', 'offensive', 'inappropriate', 'personal'];
//   return harmfulKeywords.some(keyword => response.toLowerCase().includes(keyword));
// }

// router.get('/voice', (req, res) => {
//   res.status(200).send('Twilio webhook endpoint');
// });

// router.post('/voice', (req, res) => {
//   try {
//     const twiml = new VoiceResponse();
//     twiml.gather({
//       input: 'speech',
//       action: '/twilio/gather',
//       speechTimeout: 'auto',
//       hints: 'help, information, support',
//     }).say({ voice: 'Polly.Kajal-Neural' }, 'Hello! I’m your assistant. What would you like to know?');
//     console.log('Voice webhook TwiML:', twiml.toString());
//     res.type('text/xml');
//     res.send(twiml.toString());
//   } catch (error) {
//     console.error('Error in voice webhook:', error.message, error.stack);
//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Sorry, an error occurred. Please try again.');
//     res.type('text/xml');
//     res.send(twiml.toString());
//   }
// });

// router.post('/inbound', (req, res) => {
//   try {
//     const twiml = new VoiceResponse();
//     twiml.gather({
//       input: 'speech',
//       action: '/twilio/gather',
//       speechTimeout: 'auto',
//       hints: 'help, information, support',
//     }).say({ voice: 'Polly.Kajal-Neural' }, 'Welcome! I’m your assistant. How can I help you today?');
//     console.log('Inbound webhook TwiML:', twiml.toString());
//     res.type('text/xml');
//     res.send(twiml.toString());
//   } catch (error) {
//     console.error('Error in inbound webhook:', error.message, error.stack);
//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Sorry, an error occurred. Please try again.');
//     res.type('text/xml');
//     res.send(twiml.toString());
//   }
// });

// router.post('/gather', async (req, res) => {
//   try {
//     console.log('Received gather webhook:', JSON.stringify(req.body, null, 2));
//     if (!req.body) {
//       const twiml = new VoiceResponse();
//       twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Invalid request. Please try again.');
//       console.log('Gather error TwiML:', twiml.toString());
//       res.type('text/xml');
//       res.send(twiml.toString());
//       return;
//     }

//     const { CallSid, From, To, SpeechResult } = req.body;
//     if (!CallSid || !From || !To) {
//       const twiml = new VoiceResponse();
//       twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Missing call details. Please try again.');
//       console.log('Gather error TwiML:', twiml.toString());
//       res.type('text/xml');
//       res.send(twiml.toString());
//       return;
//     }

//     if (!SpeechResult) {
//       const twiml = new VoiceResponse();
//       twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, I didn’t hear anything. Please try again.');
//       twiml.redirect('/twilio/voice');
//       console.log('Gather no speech TwiML:', twiml.toString());
//       res.type('text/xml');
//       res.send(twiml.toString());
//       return;
//     }

//     console.log('Processing speech input:', SpeechResult);
//     const storedData = await queryPinecone(SpeechResult);
//     let response;
//     if (storedData) {
//       response = storedData;
//     } else {
//       response = await processQuery(SpeechResult);
//       if (response.startsWith('REVIEW:')) {
//         const reason = response.replace('REVIEW:', '');
//         const twiml = new VoiceResponse();
//         twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Your request has been flagged for review. Please try again later.');
//         twiml.redirect('/twilio/voice');
//         console.log('Review TwiML:', twiml.toString());
//         res.type('text/xml');
//         res.send(twiml.toString());
//         return;
//       }
//       if (response.includes('dial')) {
//         const { number } = JSON.parse(response);
//         const twiml = new VoiceResponse();
//         twiml.dial(number);
//         console.log('Dial TwiML:', twiml.toString());
//         res.type('text/xml');
//         res.send(twiml.toString());
//         return;
//       }
//       if (containsHarmfulContent(response)) {
//         response = 'I cannot assist with that request.';
//       } else {
//         await storeConversation({ query: SpeechResult, response, callSid: CallSid });
//       }
//     }

//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Joanna-Neural' }, response);
//     twiml.redirect('/twilio/voice');
//     console.log('Gather response TwiML:', twiml.toString());
//     res.type('text/xml');
//     res.send(twiml.toString());
//   } catch (error) {
//     console.error('Error in gather webhook:', error.message, error.stack);
//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
//     twiml.redirect('/twilio/voice');
//     console.log('Error TwiML:', twiml.toString());
//     res.type('text/xml');
//     res.send(twiml.toString());
//   }
// });

// router.post('/outbound', async (req, res) => {
//   const { to } = req.body;
//   if (!to) {
//     return res.status(400).json({ error: 'Recipient phone number is required' });
//   }

//   try {
//     const call = await twilioClient.calls.create({
//       to,
//       from: config.twilio.phoneNumber,
//       url: `${config.serverUrl}/twilio/voice`,
//       method: 'POST',
//     });
//     console.log('Outbound call initiated:', { callSid: call.sid, to });
//     res.json({ message: 'Outbound call initiated', callSid: call.sid });
//   } catch (error) {
//     console.error('Error initiating outbound call:', error.message);
//     res.status(500).json({ error: 'Failed to initiate outbound call' });
//   }
// });

// router.get('/query', async (req, res) => {
//   const { query, callSid } = req.query;
//   try {
//     console.log(`Processing query from redirect: ${query}, callSid: ${callSid}`);
//     const storedData = await queryPinecone(query);
//     let response;
//     if (storedData) {
//       response = storedData;
//     } else {
//       response = await processQuery(query);
//       if (response.startsWith('REVIEW:')) {
//         const reason = response.replace('REVIEW:', '');
//         const twiml = new VoiceResponse();
//         twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Your request has been flagged for review. Please try again later.');
//         twiml.redirect('/twilio/voice');
//         console.log('Review TwiML:', twiml.toString());
//         res.type('text/xml');
//         res.send(twiml.toString());
//         return;
//       }
//       if (response.includes('dial')) {
//         const { number } = JSON.parse(response);
//         const twiml = new VoiceResponse();
//         twiml.dial(number);
//         console.log('Dial TwiML:', twiml.toString());
//         res.type('text/xml');
//         res.send(twiml.toString());
//         return;
//       }
//       if (containsHarmfulContent(response)) {
//         response = 'I cannot assist with that request.';
//       } else {
//         await storeConversation({ query, response, callSid });
//       }
//     }

//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Joanna-Neural' }, response);
//     twiml.redirect('/twilio/voice');
//     console.log('Query response TwiML:', twiml.toString());
//     res.type('text/xml');
//     res.send(twiml.toString());
//   } catch (error) {
//     console.error('Error in query redirect:', error.message, error.stack);
//     const twiml = new VoiceResponse();
//     twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
//     twiml.redirect('/twilio/voice');
//     res.type('text/xml');
//     res.send(twiml.toString());
//   }
// });

// module.exports = router;


const express = require('express');
const { VoiceResponse } = require('twilio').twiml;
const twilio = require('twilio');
const config = require('../config');
const { processQuery } = require('../services/gemini');
const { storeConversation, queryPinecone } = require('../services/pinecone');

const router = express.Router();
const twilioClient = twilio(config.twilio.accountSid, config.twilio.authToken);
const sid =[];

function containsHarmfulContent(input) {
  const harmfulKeywords = ["harmful", "offensive", "inappropriate", "personal", "drug", "trafficking", "illegal"];
  return harmfulKeywords.some((keyword) => String(input).toLowerCase().includes(keyword));
}

router.get('/voice', (req, res) => {
  res.status(200).send('Twilio webhook endpoint');
});

router.post('/voice', (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  try {
    console.log("Call Sid :", callSid)
    
    //check if user called first time or not
    if(!sid.includes(callSid)){
      twiml.say({voice:'Polly.Kajal-Neural'}, "Hello, thank You for contacting me,  Ask me Your Question ")
    }
    else{
      twiml.say({voice:'Polly.Kajal-Neural'},"Ask me Your next Question");
    }

    sid.push(callSid);

    twiml.gather({
      input:'speech',
      speechTimeout:'auto',
      speechModel:'experimental_conversations',
      action:'/twilio/gather',
      method:'POST',
    });
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error in voice webhook:', error.message, error.stack);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Sorry, an error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

router.post('/inbound', (req, res) => {
  try {
    const twiml = new VoiceResponse();
    twiml.gather({
      input: 'speech',
      action: '/twilio/gather',
      speechTimeout: 'auto',
      hints: 'help, information, support'
    }).say({ voice: 'Polly.Kajal-Neural' }, 'Welcome! I’m your assistant. How can I help you today?');
    console.log('Inbound webhook TwiML:', twiml.toString());
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error in inbound webhook:', error.message, error.stack);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Kajal-Neural' }, 'Sorry, an error occurred. Please try again.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

router.post('/gather', async (req, res) => {
  const twiml = new VoiceResponse();
  try {
    // console.log('Received gather webhook:', JSON.stringify(req.body, null, 2));
    if (!req.body) {
      twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Invalid request. Please try again.');
      console.log('Gather error TwiML:', twiml.toString());
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    const { CallSid, From, To, SpeechResult } = req.body;
    if (!CallSid || !From || !To) {
      twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Missing call details. Please try again.');
      //console.log('Gather error TwiML:', twiml.toString());
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    if (!SpeechResult) {
      twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, I didn’t hear anything. Please try again.');
      twiml.redirect('/twilio/voice');
      console.log('Gather no speech TwiML:', twiml.toString());
      res.type('text/xml');
      res.send(twiml.toString());
      return;
    }

    console.log('Processing speech input:', SpeechResult);
    let response;
    
    // Check if the query is harmful before proceeding
    if (containsHarmfulContent(SpeechResult)) {
      // Query Pinecone for harmful queries
      const storedData = await queryPinecone(SpeechResult);
      //Check query in pinecone -> say it -> redirect to /voice
      if (storedData && storedData.response !== "[Unresponded due to harmful content]") {
        const responseFromPinecone = storedData.response;
        console.log(`Using Pinecone response for query "${SpeechResult}": ${responseFromPinecone}`);
        twiml.say({ voice: 'Polly.Kajal-Neural' }, responseFromPinecone);
        twiml.pause({ length: 2 });
        twiml.redirect('/twilio/voice')
      }else{
        //NEW harmful query detected -> store in pinecone -> say response -> hangup
        console.log(`Harmful query detected: ${SpeechResult}. Storing in Pinecone.`);
        await storeConversation({
          callSid: CallSid,
          userInput: SpeechResult,
          assistantResponse: "[Unresponded due to harmful content]"
        });
        console.log(`Stored harmful query in Pinecone: ${SpeechResult}, CallSid: ${CallSid}`);
        response = "I cannot assist with that request. Thank You";
        twiml.say({voice: 'Polly.Kajal-Neural'}, response);
        twiml.hangup();
      } 
    } 
    else {
      // If no valid Pinecone match, query Gemini
      // query is not harmful query->gemini -> if response.type-> dial transfer call OR if response.type-> fallback store (NOT STORING** USING TOOL_CAll)
      response = await processQuery(SpeechResult);

      if(response.type === 'dial'){
        twiml.say({ voice: 'Polly.Kajal-Neural' }, "Transferring you now...");
        twiml.dial(response.number); 
      } 
      else if( response.type === 'fallback'){
        await storeConversation({
          callSid: CallSid,
          userInput: SpeechResult,
          assistantResponse: "[Unresponded due to harmful content in response]"
        });
      }
      else {
        twiml.say({ voice: 'Polly.Kajal-Neural' }, response.message);
        twiml.pause({ length: 2 });
        twiml.redirect('/twilio/voice');
      }
    }

      // Why are we storing negative responses from gemini ? :))

      // if (containsHarmfulContent(response)) {
      //   response = "I cannot assist with that request.";
      //   console.log(`Harmful response detected from Gemini for query: ${SpeechResult}. Storing in Pinecone.`);
      //   await storeConversation({
      //     callSid: CallSid,
      //     userInput: SpeechResult,
      //     assistantResponse: "[Unresponded due to harmful content in response]"
      //   });
      //   console.log(`Stored harmful response in Pinecone: ${SpeechResult}, CallSid: ${CallSid}`);
      // }

    //console.log("Response:", response.message) // added for debugging
    //twiml.say({ voice: 'Polly.Joanna-Neural' }, response.message);
    //twiml.redirect('/twilio/voice');
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error in gather webhook:', error.message, error.stack);
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna-Neural' }, 'Sorry, an error occurred. Please try again.');
    twiml.redirect('/twilio/voice');
    console.log('Error TwiML:', twiml.toString());
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

router.post('/outbound', async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Recipient phone number is required' });
  }

  try {
    const call = await twilioClient.calls.create({
      to,
      from: config.twilio.phoneNumber,
      url: `${config.serverUrl}/twilio/voice`,
      method: 'POST'
    });
    console.log('Outbound call initiated:', { callSid: call.sid, to });
    res.json({ message: 'Outbound call initiated', callSid: call.sid });
  } catch (error) {
    console.error('Error initiating outbound call:', error.message);
    res.status(500).json({ error: 'Failed to initiate outbound call' });
  }
});

router.post('/query', async (req, res) => {
  const { query, callSid } = req.body;
  try {
    if (containsHarmfulContent(query)) {
      console.log(`Harmful query detected in /query route: ${query}. Storing in Pinecone.`);
      await storeConversation({
        callSid,
        userInput: query,
        assistantResponse: "[Unresponded due to harmful content]"
      });
      console.log(`Stored harmful query in Pinecone: ${query}, CallSid: ${callSid}`);
      return res.json({
        status: 'success',
        response: "I cannot assist with that request.",
        callSid,
        fromPinecone: false
      });
    }

    const storedData = await queryPinecone(query);
    if (storedData && storedData.response !== "[Unresponded due to harmful content]") {
      console.log(`Using Pinecone response for query "${query}": ${storedData.response}`);
      return res.json({
        status: 'success',
        response: storedData.response,
        callSid: storedData.callSid,
        fromPinecone: true
      });
    }

    const response = await processQuery(query);
    if (containsHarmfulContent(response)) {
      console.log(`Harmful response detected from Gemini in /query route: ${query}. Storing in Pinecone.`);
      await storeConversation({
        callSid,
        userInput: query,
        assistantResponse: "[Unresponded due to harmful content in response]"
      });
      console.log(`Stored harmful response in Pinecone: ${query}, CallSid: ${callSid}`);
      return res.json({
        status: 'success',
        response: "I cannot assist with that request.",
        callSid,
        fromPinecone: false
      });
    }

    // Do not store successful Gemini responses in Pinecone
    res.json({ status: 'success', response, callSid, fromPinecone: false });
  } catch (error) {
    console.error("Error in /query route:", error);
    res.status(500).json({ error: "Something went wrong!" });
  }
});

module.exports = router;