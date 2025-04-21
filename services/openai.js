const { OpenAI } = require('openai');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

async function processQuery(query) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: query }],
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI error:', error);
    return 'Sorry, I encountered an error. Please try again.';
  }
}

module.exports = { processQuery };