// const { Pinecone } = require('@pinecone-database/pinecone');
// const { getEmbedding } = require('./gemini');
// require('dotenv').config();

// // Initialize Pinecone client
// const pinecone = new Pinecone({
//   apiKey: process.env.PINECONE_API_KEY,
//   maxRetries: 3,
// });

// const indexName = 'voxillos';
// let index = null;
// let initializationPromise = null;

// async function initializePineconeIndex() {
//   if (initializationPromise) return initializationPromise;

//   initializationPromise = (async () => {
//     try {
//       console.log('Starting Pinecone index initialization...');
//       const indexes = await pinecone.listIndexes();
//       console.log('Available indexes:', indexes);
//       const indexExists = indexes.indexes.some(idx => idx.name === indexName);
      
//       if (!indexExists) {
//         console.log(`Creating Pinecone index "${indexName}"...`);
//         await pinecone.createIndex({
//           name: indexName,
//           dimension: 768,
//           metric: 'cosine',
//           spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
//         });
//         console.log(`Waiting for Pinecone index "${indexName}" to be ready...`);
//         await new Promise(resolve => setTimeout(resolve, 30000)); // Wait for index creation
//         console.log(`Pinecone index "${indexName}" created`);
//       } else {
//         console.log(`Pinecone index "${indexName}" already exists`);
//       }

//       index = pinecone.Index(indexName);
//       if (!index) {
//         throw new Error('Failed to initialize Pinecone index object');
//       }
      
//       await ensurePineconeIndex();
//       console.log('Pinecone index initialization complete');
//     } catch (err) {
//       console.error('Error initializing Pinecone index:', err.message, err.stack);
//       throw err;
//     }
//   })();

//   return initializationPromise;
// }

// async function ensurePineconeIndex() {
//   let attempts = 0;
//   const maxAttempts = 5;
//   while (attempts < maxAttempts) {
//     try {
//       if (!index) {
//         throw new Error('Pinecone index is not initialized');
//       }
//       const stats = await index.describeIndexStats();
//       console.log(`Pinecone index "${indexName}" is ready. Stats:`, stats);
//       return;
//     } catch (err) {
//       attempts++;
//       console.error(`Pinecone index check attempt ${attempts} failed:`, err.message);
//       if (attempts === maxAttempts) {
//         throw new Error(`Failed to verify Pinecone index "${indexName}" after ${maxAttempts} attempts: ${err.message}`);
//       }
//       await new Promise(resolve => setTimeout(resolve, 5000));
//     }
//   }
// }

// async function validatePineconeAccess() {
//   try {
//     const indexes = await pinecone.listIndexes();
//     console.log('Available Pinecone indexes:', indexes);
//     const indexExists = indexes.indexes.some(idx => idx.name === indexName);
//     if (!indexExists) {
//       throw new Error(`Pinecone index "${indexName}" does not exist. Ensure the API key has access to the correct project.`);
//     }
//   } catch (err) {
//     console.error('Pinecone API key validation failed:', err.message, err.stack);
//     throw err;
//   }
// }

// async function storeConversation({ query, response, callSid }) {
//   await initializePineconeIndex();
//   try {
//     if (!index) {
//       throw new Error('Pinecone index not initialized');
//     }
//     const embedding = await getEmbedding(query);
//     const vector = {
//       id: callSid || `conv_${Date.now()}`,
//       values: embedding,
//       metadata: { query, response, timestamp: new Date().toISOString() },
//     };
//     await index.upsert([vector]);
//     console.log(`Stored conversation in Pinecone: ${vector.id}`);
//   } catch (err) {
//     console.error(`Failed to store conversation in Pinecone:`, err.message, err.stack);
//     throw err;
//   }
// }

// async function queryPinecone(query) {
//   await initializePineconeIndex();
//   const maxRetries = 3;
//   let attempt = 0;

//   while (attempt < maxRetries) {
//     try {
//       console.log(`Querying Pinecone (attempt ${attempt + 1}):`, { query });
//       if (!index) {
//         throw new Error('Pinecone index not initialized');
//       }
//       const embedding = await getEmbedding(query);
//       const queryResponse = await index.query({
//         vector: embedding,
//         topK: 1,
//         includeMetadata: true,
//       });
//       if (queryResponse.matches.length > 0) {
//         const match = queryResponse.matches[0];
//         console.log(`Pinecone match found:`, match.id);
//         return match.metadata.response;
//       } else {
//         console.log(`No Pinecone match found for query: ${query}`);
//         return null;
//       }
//     } catch (error) {
//       attempt++;
//       console.error(`Pinecone query error (attempt ${attempt}):`, error.message, error.stack);
//       if (error.message.includes('401') || error.message.includes('Unauthorized')) {
//         console.error('Fatal: Invalid Pinecone API key. Please verify PINECONE_API_KEY in .env.');
//         return null;
//       }
//       if (attempt === maxRetries) {
//         console.error('Max retries reached for Pinecone query. Returning null.');
//         return null;
//       }
//       await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
//     }
//   }
// }

// async function checkPineconeForQuery(query) {
//   await initializePineconeIndex();
//   try {
//     if (!index) {
//       throw new Error('Pinecone index not initialized');
//     }
//     const embedding = await getEmbedding(query);
//     console.log('Generated embedding for query:', query, embedding.slice(0, 5));
//     const results = await index.query({
//       vector: embedding,
//       topK: 5,
//       includeMetadata: true,
//       includeValues: true,
//     });
//     console.log('Pinecone query results:', results);
//     if (results.matches && results.matches.length > 0) {
//       for (const match of results.matches) {
//         console.log('Match details:', match);
//         if (match.score > 0.85 && match.metadata && match.metadata.query) {
//           const normalizedQuery = match.metadata.query.toLowerCase().trim();
//           const normalizedInput = query.toLowerCase().trim();
//           if (normalizedQuery === normalizedInput && match.metadata.response) {
//             console.log(`Found matching response in Pinecone for query: ${query}, Score: ${match.score}`);
//             return {
//               response: match.metadata.response,
//               callSid: match.id,
//             };
//           }
//         }
//       }
//     }
//     console.log(`No matching response found in Pinecone for query: ${query}`);
//     return null;
//   } catch (err) {
//     console.error('Error querying Pinecone:', err.message, err.stack);
//     return null;
//   }
// }

// async function saveEditedResponse({ callSid, editedResponse, query }) {
//   await initializePineconeIndex();
//   try {
//     if (!index) {
//       throw new Error('Pinecone index not initialized');
//     }
//     const embedding = await getEmbedding(query);
//     await index.upsert([
//       {
//         id: callSid,
//         values: embedding,
//         metadata: {
//           query,
//           response: editedResponse,
//           timestamp: new Date().toISOString(),
//         },
//       },
//     ]);
//     console.log(`Updated Pinecone with edited response for query: ${query}`);
//     return { status: 'success', response: editedResponse, message: 'Updated response saved.' };
//   } catch (err) {
//     console.error('Error saving edited response:', err.message, err.stack);
//     throw err;
//   }
// }

// async function getPineconeData() {
//   await initializePineconeIndex();
//   try {
//     if (!index) {
//       throw new Error('Pinecone index not initialized');
//     }
//     await ensurePineconeIndex();
//     const stats = await index.describeIndexStats();
//     const totalVectors = stats.totalVectorCount || 0;
//     console.log('Total vectors in Pinecone:', totalVectors);
//     if (totalVectors === 0) {
//       console.log('No vectors found in Pinecone. Returning empty array.');
//       return [];
//     }
//     const dummyVector = Array(768).fill(0);
//     const results = await index.query({
//       vector: dummyVector,
//       topK: totalVectors,
//       includeMetadata: true,
//       includeValues: false,
//     });
//     console.log('Fetched vectors from Pinecone:', JSON.stringify(results, null, 2));
//     const data = [];
//     if (results.matches && results.matches.length > 0) {
//       for (const match of results.matches) {
//         if (match.metadata && match.metadata.query) {
//           data.push({
//             id: match.id,
//             query: match.metadata.query,
//             response: match.metadata.response || 'Not edited yet',
//             timestamp: match.metadata.timestamp,
//           });
//         }
//       }
//     }
//     console.log('Returning data to frontend:', data);
//     return data;
//   } catch (err) {
//     console.error('Error fetching Pinecone data:', err.message, err.stack);
//     throw err;
//   }
// }

// // Initialize Pinecone index on module load
// initializePineconeIndex().catch(err => {
//   console.error('Failed to initialize Pinecone:', err.message);
//   process.exit(1);
// });

// module.exports = {
//   pinecone,
//   get index() {
//     if (!index) {
//       throw new Error('Pinecone index is not initialized. Ensure initializePineconeIndex has completed.');
//     }
//     return index;
//   },
//   storeConversation,
//   queryPinecone,
//   checkPineconeForQuery,
//   saveEditedResponse,
//   getPineconeData,
//   initializePineconeIndex,
//   validatePineconeAccess,
//   ensurePineconeIndex,
// };

const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

async function createIndex() {
    try {
      await pc.createIndex({
        name: 'voxillos',
        dimension: 768, 
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1', 
          }
        }
      });
      console.log('Index created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Index already exists');
      } else {
        console.error('Failed to create index:', error.message);
      }
    }
}

const index = pc.Index('voxillos');

async function ensurePineconeIndex() {
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    try {
      await index.describeIndexStats();
      console.log('Pinecone index "voxillos" is ready in pinecone.js');
      return;
    } catch (err) {
      attempts++;
      console.error(`Pinecone index check attempt ${attempts} failed in pinecone.js:`, err.message);
      if (attempts === maxAttempts) {
        console.error('Failed to verify Pinecone index after maximum attempts in pinecone.js.');
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function storeConversation({ callSid, from = '', to = '', userInput, assistantResponse }) {
  const timestamp = new Date();
  const { getEmbedding } = require('./gemini.js');
  const embedding = await getEmbedding(userInput);

  await ensurePineconeIndex();
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await index.upsert([
        {
          id: callSid,
          values: embedding,
          metadata: {
            userInput,
            assistantResponse,
            timestamp: timestamp.toISOString()
          }
        }
      ]);
      console.log(`Successfully stored conversation in Pinecone: ${userInput}, AssistantResponse: ${assistantResponse}, CallSid: ${callSid}`);
      break;
    } catch (err) {
      console.error(`Attempt ${attempt} failed to upsert conversation in Pinecone:`, err.message);
      if (attempt === 3) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function queryPinecone(userInput) {
  try {
    const { getEmbedding } = require('./gemini.js');
    const embedding = await getEmbedding(userInput);
    const results = await index.query({
      vector: embedding,
      topK: 1,
      includeMetadata: true
    });

    console.log(`Querying Pinecone for userInput: ${userInput}, Results:`, JSON.stringify(results, null, 2));

    if (results.matches && results.matches.length > 0) {
      const match = results.matches[0];
      if (match.score > 0.85 && match.metadata && match.metadata.userInput) {
        const normalizedQuery = match.metadata.userInput.toLowerCase().trim();
        const normalizedInput = userInput.toLowerCase().trim();
        if (normalizedQuery === normalizedInput && match.metadata.assistantResponse) {
          console.log(`Pinecone match found for query: ${userInput}, Response: ${match.metadata.assistantResponse}`);
          return {
            response: match.metadata.assistantResponse,
            callSid: match.id
          };
        }
      }
    }
    console.log(`No Pinecone match found for query: ${userInput}`);
    return null;
  } catch (err) {
    console.error('Error querying Pinecone:', err);
    return null;
  }
}

module.exports = { storeConversation, storeFallbackQuery: storeConversation, queryPinecone };