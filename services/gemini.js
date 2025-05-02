// const { GoogleGenerativeAI } = require('@google/generative-ai');
// require('dotenv').config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const embedModel = genAI.getGenerativeModel({ model: 'embedding-001' });
// const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// const transferHuman = {
//   name: 'transferToHuman',
//   description: 'When user asks about Rohit Hans or wants to transfer call to Rohit',
//   parameters: {
//     type: 'object',
//     properties: {
//       number: {
//         type: 'string',
//         description: 'Phone number of the human to transfer the call to',
//       },
//     },
//   },
// };

// const storeForReview = {
//   name: 'storeForReview',
//   description: 'Use this when the assistant is unsure about the answer or needs human review',
//   parameters: {
//     type: 'object',
//     properties: {
//       reason: {
//         type: 'string',
//         description: 'Why the assistant wants to store this voxillo',
//       },
//     },
//     required: ['reason'],
//   },
// };

// async function getEmbedding(userInput) {
//   try {
//     const result = await embedModel.embedContent(userInput);
//     const embedding = result.embedding.values;
//     return embedding;
//   } catch (err) {
//     console.error(`Failed to generate embedding for "${userInput}":`, err.message, err.stack);
//     throw err;
//   }
// }

// async function handleToolCall(toolCall) {
//   const { name, args } = toolCall;
//   if (name === 'transferToHuman') {
//     return {
//       type: 'dial',
//       number: process.env.DEFAULT_TRANSFER_NUMBER,
//     };
//   }
//   if (name === 'storeForReview') {
//     console.log(`Storing for review: ${args.reason}`);
//     return { type: 'review', reason: args.reason };
//   }
//   return 'Unknown Tool requested';
// }

// async function processQuery(query, conversationHistory = []) {
//   const maxRetries = 3;
//   let attempt = 0;
//   const { queryPinecone, storeConversation } = require('./pinecone');

//   while (attempt < maxRetries) {
//     try {
//       console.log(`Sending query to Gemini (attempt ${attempt + 1}):`, { query, historyLength: conversationHistory.length });

//       const messages = [
//         ...conversationHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
//         { role: 'user', parts: [{ text: query }] },
//       ];

//       messages.unshift({ role: 'user', parts: [{ text: 'You are a helpful, creative, and friendly assistant.' }] });

//       const result = await textModel.generateContent({
//         contents: messages,
//         tools: [
//           { functionDeclarations: [transferHuman] },
//           { functionDeclarations: [storeForReview] },
//         ],
//       });

//       const response = result.response.text();
//       console.log('Gemini response:', response);

//       const toolCalls = result.response.functionCalls || [];
//       if (toolCalls.length > 0) {
//         const toolCall = toolCalls[0];
//         const toolResult = await handleToolCall(toolCall);
//         if (toolResult.type === 'review') {
//           console.log(`Triggering review for query "${query}" with reason: ${toolResult.reason}`);
//           return `REVIEW:${toolResult.reason}`;
//         }
//         return JSON.stringify(toolResult);
//       }

//       if (
//         query.toLowerCase().includes('transfer call') ||
//         query.toLowerCase().includes('connect me to human') ||
//         query.toLowerCase().includes('transfer call to person')
//       ) {
//         return JSON.stringify(await handleToolCall({ name: 'transferToHuman', args: {} }));
//       }

//       const storedData = await queryPinecone(query);
//       if (storedData) {
//         return storedData;
//       }

//       await storeConversation({ query, response });

//       return response.trim();
//     } catch (error) {
//       attempt++;
//       console.error(`Gemini API error (attempt ${attempt}):`, error.message, error.stack);
//       if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
//         console.error('Fatal: Invalid Gemini API key. Please verify GEMINI_API_KEY in .env.');
//         return 'Sorry, the assistant is unavailable due to an invalid API key. Please try again later.';
//       }
//       if (attempt === maxRetries) {
//         console.error('Max retries reached. Returning fallback response for query:', query);
//         return 'Sorry, I couldn’t process your request. Please try again.';
//       }
//       await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
//     }
//   }
// }

// module.exports = { processQuery, getEmbedding, handleToolCall };

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: 'embedding-001' });
const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const transferHuman = {
  name: 'transferToHuman',
  description: 'When user asks about Rohit Hans or wants to transfer call to Rohit',
  parameters: {
    type: 'object',
    properties: {
      number: {
        type: 'string',
        description: 'Phone number of the human to transfer the call to',
      },
    },
  },
};

const storeForReview = {
  name: 'storeForReview',
  description: 'Use this when the assistant is unsure about the answer or needs human review',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Why the assistant wants to store this voxillo',
      },
    },
    required: ['reason'],
  },
};

async function getEmbedding(userInput) {
  try {
    const result = await embedModel.embedContent(userInput);
    const embedding = result.embedding.values;
    return embedding;
  } catch (err) {
    console.error(`Failed to generate embedding for "${userInput}":`, err.message, err.stack);
    throw err;
  }
}

async function handleToolCall(toolCall) {
  const { name, args } = toolCall;
  if (name === 'transferToHuman') {
    return {
      type: 'dial',
      number: process.env.DEFAULT_TRANSFER_NUMBER,
    };
  }
  if (name === 'storeForReview') {
    console.log(`Storing for review: ${args.reason}`);
    return { type: 'review', reason: args.reason };
  }
  return 'Unknown Tool requested';
}

async function processQuery(query, conversationHistory = []) {
  const maxRetries = 3;
  let attempt = 0;
  const { queryPinecone, storeConversation } = require('./pinecone');

  while (attempt < maxRetries) {
    try {
      console.log(`Sending query to Gemini (attempt ${attempt + 1}):`, { query, historyLength: conversationHistory.length });

      const messages = [
        ...conversationHistory.map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        { role: 'user', parts: [{ text: query }] },
      ];

      messages.unshift({ role: 'user', parts: [{ text: 'You are a helpful, creative, and friendly assistant.' }] });

      const result = await textModel.generateContent({
        contents: messages,
        tools: [
          { functionDeclarations: [transferHuman] },
          { functionDeclarations: [storeForReview] },
        ],
      });

      let response = result.response.text();
      console.log('Gemini response:', response);

      const toolCalls = result.response.functionCalls || [];
      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const toolResult = await handleToolCall(toolCall);
        if (toolResult.type === 'review') {
          console.log(`Triggering review for query "${query}" with reason: ${toolResult.reason}`);
          await storeConversation({ query, response: `Not edited yet (Reason: ${toolResult.reason})`, isUnanswered: true });
          return `REVIEW:${toolResult.reason}`;
        }
        return JSON.stringify(toolResult);
      }

      if (
        query.toLowerCase().includes('transfer call') ||
        query.toLowerCase().includes('connect me to human') ||
        query.toLowerCase().includes('transfer call to person')
      ) {
        return JSON.stringify(await handleToolCall({ name: 'transferToHuman', args: {} }));
      }

      const storedData = await queryPinecone(query);
      if (storedData) {
        return storedData;
      }

      // Check if response indicates Gemini couldn't answer
      const isUnanswered = response.includes('Sorry, I couldn’t process') || response.includes('I don’t have enough information');
      if (isUnanswered) {
        await storeConversation({ query, response: 'Not edited yet', isUnanswered: true });
      }

      return response.trim();
    } catch (error) {
      attempt++;
      console.error(`Gemini API error (attempt ${attempt}):`, error.message, error.stack);
      if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
        console.error('Fatal: Invalid Gemini API key. Please verify GEMINI_API_KEY in .env.');
        await storeConversation({ query, response: 'Not edited yet', isUnanswered: true });
        return 'Sorry, the assistant is unavailable due to an invalid API key. Please try again later.';
      }
      if (attempt === maxRetries) {
        console.error('Max retries reached. Returning fallback response for query:', query);
        await storeConversation({ query, response: 'Not edited yet', isUnanswered: true });
        return 'Sorry, I couldn’t process your request. Please try again.';
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
}

module.exports = { processQuery, getEmbedding, handleToolCall };