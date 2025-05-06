// const express = require('express');
// const cors = require('cors');
// const twilioRoutes = require('./routes/twilio');
// const { getEmbedding } = require('./services/gemini');
// const { Pinecone } = require('@pinecone-database/pinecone');
// require('dotenv').config();
// const { v4: uuidv4 } = require('uuid');

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const corsOptions = {
//   origin: 'http://localhost:5173',
//   credentials: true,
// };
// app.use(cors(corsOptions));

// const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// async function validatePineconeAccess() {
//   try {
//     const indexes = await pc.listIndexes();
//     console.log('Available Pinecone indexes:', indexes);
//     const indexExists = indexes.indexes.some(idx => idx.name === 'voxillos');
//     if (!indexExists) {
//       throw new Error('Pinecone index "voxillos" does not exist. Ensure the API key has access to the correct project.');
//     }
//   } catch (err) {
//     console.error('Pinecone API key validation failed:', err.message, err.stack);
//     throw err;
//   }
// }

// async function initializePineconeIndex() {
//   try {
//     const indexes = await pc.listIndexes();
//     const indexExists = indexes.indexes.some(index => index.name === 'voxillos');
//     if (!indexExists) {
//       console.log('Creating Pinecone index "voxillos"...');
//       await pc.createIndex({
//         name: 'voxillos',
//         dimension: 768,
//         metric: 'cosine',
//         spec: {
//           serverless: {
//             cloud: 'aws',
//             region: 'us-east-1',
//           }
//         }
//       });
//       await new Promise(resolve => setTimeout(resolve, 30000));
//       console.log('Pinecone index "voxillos" created');
//     } else {
//       console.log('Pinecone index "voxillos" already exists');
//     }
//   } catch (err) {
//     console.error('Error initializing Pinecone index:', err);
//     throw err;
//   }
// }

// async function ensurePineconeIndex(index) {
//   let attempts = 0;
//   const maxAttempts = 5;
//   while (attempts < maxAttempts) {
//     try {
//       await index.describeIndexStats();
//       console.log('Pinecone index "voxillos" is ready');
//       return;
//     } catch (err) {
//       attempts++;
//       console.error(`Pinecone index check attempt ${attempts} failed:`, err.message);
//       if (attempts === maxAttempts) {
//         console.error('Failed to verify Pinecone index after maximum attempts.');
//         throw err;
//       }
//       await new Promise(resolve => setTimeout(resolve, 5000));
//     }
//   }
// }

// const index = pc.Index('voxillos');

// async function checkPineconeForQuery(query) {
//   try {
//     const embedding = await getEmbedding(query);
//     console.log('Generated embedding for query:', query, embedding.slice(0, 5));

//     const results = await index.query({
//       vector: embedding,
//       topK: 5,
//       includeMetadata: true,
//       includeValues: true
//     });

//     console.log('Pinecone query results:', results);

//     if (results.matches && results.matches.length > 0) {
//       for (const match of results.matches) {
//         console.log('Match details:', match);
//         if (match.score > 0.85 && match.metadata && match.metadata.userInput) {
//           const normalizedQuery = match.metadata.userInput.toLowerCase().trim();
//           const normalizedInput = query.toLowerCase().trim();
//           if (normalizedQuery === normalizedInput && match.metadata.assistantResponse) {
//             console.log(`Found matching response in Pinecone for query: ${query}, Score: ${match.score}`);
//             return {
//               response: match.metadata.assistantResponse,
//               callSid: match.id
//             };
//           }
//         }
//       }
//     }
//     console.log(`No matching response found in Pinecone for query: ${query}`);
//     return null;
//   } catch (err) {
//     console.error('Error querying Pinecone:', err);
//     return null;
//   }
// }

// app.get('/', (req, res) => {
//   res.status(200).send('Twilio-ChatGPT Backend');
// });

// app.use('/twilio', twilioRoutes);

// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// app.post('/api/query', async (req, res) => {
//   try {
//     let { query, callSid, conversationHistory = [] } = req.body;

//     if (!callSid) {
//       callSid = uuidv4();
//       console.log(`Generated callSid: ${callSid}`);
//     }

//     const storedData = await checkPineconeForQuery(query);
//     if (storedData) {
//       console.log(`Found response in Pinecone for query: ${query}`);
//       res.json({ 
//         status: 'success', 
//         response: storedData.response, 
//         callSid: storedData.callSid, 
//         fromPinecone: true 
//       });
//       return;
//     }

//     res.redirect(`/twilio/query?query=${encodeURIComponent(query)}&callSid=${callSid}`);
//   } catch (err) {
//     console.error('Error processing query:', err);
//     res.status(500).json({ error: 'Failed to process query' });
//   }
// });

// app.post('/api/save-edited-response', async (req, res) => {
//   try {
//     const { callSid, editedResponse, query } = req.body;
//     if (!callSid || !editedResponse || !query) {
//       return res.status(400).json({ error: 'callSid, editedResponse, and query are required' });
//     }
//     const embedding = await getEmbedding(query);

//     await index.upsert([
//       {
//         id: callSid,
//         values: embedding,
//         metadata: {
//           userInput: query,
//           assistantResponse: editedResponse,
//           timestamp: new Date().toISOString()
//         }
//       }
//     ]);
//     console.log(`Updated Pinecone with edited response for query: ${query}`);

//     res.json({ status: 'success', response: editedResponse, message: 'Your query result was found and updated.' });
//   } catch (err) {
//     console.error('Error saving edited response:', err);
//     res.status(500).json({ error: 'Failed to save edited response' });
//   }
// });

// app.get('/api/pinecone-data', async (req, res) => {
//   try {
//     await ensurePineconeIndex(index);
//     const stats = await index.describeIndexStats();
//     const totalVectors = stats.totalVectorCount || 0;
//     console.log('Total vectors in Pinecone:', totalVectors);

//     if (totalVectors === 0) {
//       console.log('No vectors found in Pinecone. Returning empty array.');
//       return res.json([]);
//     }

//     const dummyVector = Array(768).fill(0);
//     const results = await index.query({
//       vector: dummyVector,
//       topK: totalVectors,
//       includeMetadata: true,
//       includeValues: false
//     });

//     console.log('Fetched vectors from Pinecone:', JSON.stringify(results, null, 2));

//     const data = [];
//     if (results.matches && results.matches.length > 0) {
//       for (const match of results.matches) {
//         if (match.metadata && match.metadata.userInput) {
//           data.push({
//             id: match.id,
//             query: match.metadata.userInput,
//             response: match.metadata.assistantResponse || 'Not edited yet',
//             timestamp: match.metadata.timestamp
//           });
//         }
//       }
//     }

//     console.log('Returning data to frontend:', data);
//     res.json(data);
//   } catch (err) {
//     console.error('Error fetching Pinecone data:', err.message, err.stack);
//     res.status(500).json({ error: 'Failed to fetch Pinecone data' });
//   }
// });

// (async () => {
//   try {
//     await initializePineconeIndex();
//     await validatePineconeAccess();
//     await ensurePineconeIndex(index);

//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('Failed to start server:', err);
//     process.exit(1);
//   }
// })();



// const express = require('express');
// const cors = require('cors');
// const twilioRoutes = require('./routes/twilio');
// const { checkPineconeForQuery, saveEditedResponse, getPineconeData, initializePineconeIndex, validatePineconeAccess, ensurePineconeIndex } = require('./services/pinecone');
// require('dotenv').config();
// const { v4: uuidv4 } = require('uuid');

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// const corsOptions = {
//   origin: 'http://localhost:5173',
//   credentials: true,
// };
// app.use(cors(corsOptions));

// app.get('/', (req, res) => {
//   res.status(200).send('Twilio-ChatGPT Backend');
// });

// app.use('/twilio', twilioRoutes);

// app.get('/health', (req, res) => {
//   res.json({ status: 'ok' });
// });

// app.post('/api/query', async (req, res) => {
//   try {
//     let { query, callSid, conversationHistory = [] } = req.body;

//     if (!callSid) {
//       callSid = uuidv4();
//       console.log(`Generated callSid: ${callSid}`);
//     }

//     const storedData = await checkPineconeForQuery(query);
//     if (storedData) {
//       console.log(`Found response in Pinecone for query: ${query}`);
//       res.json({
//         status: 'success',
//         response: storedData.response,
//         callSid: storedData.callSid,
//         fromPinecone: true,
//       });
//       return;
//     }

//     res.redirect(`/twilio/query?query=${encodeURIComponent(query)}&callSid=${callSid}`);
//   } catch (err) {
//     console.error('Error processing query:', err);
//     res.status(500).json({ error: 'Failed to process query' });
//   }
// });

// app.post('/api/save-edited-response', async (req, res) => {
//   try {
//     const { callSid, editedResponse, query } = req.body;
//     if (!callSid || !editedResponse || !query) {
//       return res.status(400).json({ error: 'callSid, editedResponse, and query are required' });
//     }
//     const result = await saveEditedResponse({ callSid, editedResponse, query });
//     res.json(result);
//   } catch (err) {
//     console.error('Error saving edited response:', err);
//     res.status(500).json({ error: 'Failed to save edited response' });
//   }
// });

// app.get('/api/pinecone-data', async (req, res) => {
//   try {
//     const data = await getPineconeData();
//     res.json(data);
//   } catch (err) {
//     console.error('Error fetching Pinecone data:', err.message, err.stack);
//     res.status(500).json({ error: 'Failed to fetch Pinecone data' });
//   }
// });

// (async () => {
//   try {
//     console.log('Starting server initialization...');
//     await initializePineconeIndex();
//     await validatePineconeAccess();
//     await ensurePineconeIndex();
//     console.log('Server initialization complete');

//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//       console.log(`Server running on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('Failed to start server:', err.message, err.stack);
//     process.exit(1);
//   }
// })();


const express = require('express');
const cors = require('cors');
const twilioRoutes = require('./routes/twilio');
const { getEmbedding } = require('./services/gemini');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.Index('voxillos');

async function initializePineconeIndex() {
  try {
    const indexes = await pc.listIndexes();
    const indexExists = indexes.indexes.some(index => index.name === 'voxillos');
    if (!indexExists) {
      console.log('Creating Pinecone index "voxillos"...');
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
      await new Promise(resolve => setTimeout(resolve, 30000));
      console.log('Pinecone index "voxillos" created');
    } else {
      console.log('Pinecone index "voxillos" already exists');
    }
  } catch (err) {
    console.error('Error initializing Pinecone index:', err);
    throw err;
  }
}

async function validatePineconeAccess() {
  try {
    const indexes = await pc.listIndexes();
    //console.log('Available Pinecone indexes:', indexes);
    const indexExists = indexes.indexes.some(idx => idx.name === 'voxillos');
    if (!indexExists) {
      throw new Error('Pinecone index "voxillos" does not exist. Ensure the API key has access to the correct project.');
    }
  } catch (err) {
    console.error('Pinecone API key validation failed:', err.message, err.stack);
    throw err;
  }
}

async function ensurePineconeIndex(index) {
  let attempts = 0;
  const maxAttempts = 5;
  while (attempts < maxAttempts) {
    try {
      await index.describeIndexStats();
      console.log('Pinecone index "voxillos" is ready');
      return;
    } catch (err) {
      attempts++;
      console.error(`Pinecone index check attempt ${attempts} failed:`, err.message);
      if (attempts === maxAttempts) {
        console.error('Failed to verify Pinecone index after maximum attempts.');
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

async function checkPineconeForQuery(query) {
  try {
    const embedding = await getEmbedding(query);
    console.log('Generated embedding for query:', query, embedding.slice(0, 5));

    const results = await index.query({
      vector: embedding,
      topK: 5,
      includeMetadata: true,
      includeValues: true
    });

    console.log('Pinecone query results:', results);

    if (results.matches && results.matches.length > 0) {
      for (const match of results.matches) {
        console.log('Match details:', match);
        if (match.score > 0.85 && match.metadata && match.metadata.userInput) {
          console.log(`Found matching response in Pinecone for query: ${query}, Score: ${match.score}`);
          return {
            response: match.metadata.assistantResponse,
            callSid: match.id
          };
          // const normalizedQuery = match.metadata.userInput.toLowerCase().trim();
          // const normalizedInput = query.toLowerCase().trim();
          // if (normalizedQuery === normalizedInput && match.metadata.assistantResponse) {
          //   console.log(`Found matching response in Pinecone for query: ${query}, Score: ${match.score}`);
          //   return {
          //     response: match.metadata.assistantResponse,
          //     callSid: match.id
          //   };
          // }
        }
      }
    }
    console.log(`No matching response found in Pinecone for query: ${query}`);
    return null;
  } catch (err) {
    console.error('Error querying Pinecone:', err);
    return null;
  }
}

app.get('/', (req, res) => {
  res.status(200).send('Twilio-ChatGPT Backend');
});

app.use('/twilio', twilioRoutes);

app.post('/api/query', async (req, res) => {
  try {
    let { query, callSid, conversationHistory = [] } = req.body;

    if (!callSid) {
      callSid = uuidv4();
      console.log(`Generated callSid: ${callSid}`);
    }

    const storedData = await checkPineconeForQuery(query);
    if (storedData) {
      console.log(`Found response in Pinecone for query: ${query}`);
      res.json({ 
        status: 'success', 
        response: storedData.response, 
        callSid: storedData.callSid, 
        fromPinecone: true 
      });
      return;
    }

    res.redirect(`/twilio/query?query=${encodeURIComponent(query)}&callSid=${callSid}`);
  } catch (err) {
    console.error('Error processing query:', err);
    res.status(500).json({ error: 'Failed to process query' });
  }
});

app.post('/api/save-edited-response', async (req, res) => {
  try {
    const { callSid, editedResponse, query } = req.body;
    if (!callSid || !editedResponse || !query) {
      return res.status(400).json({ error: 'callSid, editedResponse, and query are required' });
    }
    const embedding = await getEmbedding(query);

    await index.upsert([
      {
        id: callSid,
        values: embedding,
        metadata: {
          userInput: query,
          assistantResponse: editedResponse,
          timestamp: new Date().toISOString()
        }
      }
    ]);
    console.log(`Successfully updated Pinecone with edited response for query: ${query}, callSid: ${callSid}`);

    res.json({ status: 'success', response: editedResponse, message: 'Your query result was found and updated.' });
  } catch (err) {
    console.error('Error saving edited response:', err);
    res.status(500).json({ error: 'Failed to save edited response' });
  }
});

app.get('/api/pinecone-data', async (req, res) => {
  try {
    await ensurePineconeIndex(index);
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalVectorCount || 0;
    console.log('Total vectors in Pinecone (/api/pinecone-data):', totalVectors);

    if (totalVectors === 0) {
      console.log('No queries found in Pinecone (/api/pinecone-data). Returning empty array.');
      return res.json([]);
    }

    const dummyVector = Array(768).fill(0);
    const results = await index.query({
      vector: dummyVector,
      topK: totalVectors,
      includeMetadata: true,
      includeValues: false
    });

    console.log('Fetched vectors from Pinecone (/api/pinecone-data):', JSON.stringify(results, null, 2));

    const data = [];
    if (results.matches && results.matches.length > 0) {
      for (const match of results.matches) {
        if (match.metadata && match.metadata.userInput) {
          console.log(`Processing Pinecone entry (/api/pinecone-data): Query=${match.metadata.userInput}, Response=${match.metadata.assistantResponse}`);
          data.push({
            id: match.id,
            query: match.metadata.userInput,
            response: match.metadata.assistantResponse || 'Not edited yet',
            timestamp: match.metadata.timestamp
          });
        }
      }
    }

    console.log('Returning queries to frontend (/api/pinecone-data):', data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching Pinecone data (/api/pinecone-data):', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch Pinecone data' });
  }
});

app.get('/api/pinecone-fallbacks', async (req, res) => {
  try {
    await ensurePineconeIndex(index);
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalRecordCount || 0;
    console.log('Total vectors in Pinecone (/api/pinecone-fallbacks):', totalVectors);

    if (totalVectors === 0) {
      console.log('No queries found in Pinecone (/api/pinecone-fallbacks). Returning empty array.');
      return res.json([]);
    }

    const dummyVector = Array(768).fill(0);
    const results = await index.query({
      vector: dummyVector,
      topK: totalVectors,
      includeMetadata: true,
      includeValues: false
    });

    console.log('Fetched vectors from Pinecone (/api/pinecone-fallbacks):', JSON.stringify(results, null, 2));

    const data = [];
    if (results.matches && results.matches.length > 0) {
      for (const match of results.matches) {
        if (match.metadata && match.metadata.userInput) {
          console.log(`Processing Pinecone entry (/api/pinecone-fallbacks): Query=${match.metadata.userInput}, Response=${match.metadata.assistantResponse}`);
          data.push({
            id: match.id,
            query: match.metadata.userInput,
            response: match.metadata.assistantResponse || 'Not edited yet',
            timestamp: match.metadata.timestamp
          });
        }
      }
    }

    console.log('Returning queries to frontend (/api/pinecone-fallbacks):', data);
    res.json(data);
  } catch (err) {
    console.error('Error fetching Pinecone fallbacks (/api/pinecone-fallbacks):', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch Pinecone fallbacks' });
  }
});

(async () => {
  try {
    await initializePineconeIndex();
    await validatePineconeAccess();
    await ensurePineconeIndex(index);

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();