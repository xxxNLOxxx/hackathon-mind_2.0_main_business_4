import dotenv from 'dotenv';
dotenv.config();

export const AI_CONFIG = {
  port: process.env.PORT || 3001,
  apiKey: process.env.OPENROUTER_API_KEY,
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'google/gemini-2.0-flash-exp:free',
  maxCodeLength: 300,
  timeout: 15000
};