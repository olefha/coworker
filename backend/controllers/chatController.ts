/* eslint-disable @typescript-eslint/no-empty-object-type */
// controllers/chatController.ts

import { Request, Response } from 'express';
import { getAIResponse } from '../services/aiService';
import { ChatRequest, ChatResponse } from '../models/chatModels';

export const handleChat = async (req: Request<{}, {}, ChatRequest>, res: Response<ChatResponse>) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ message: 'Invalid message provided.' });
  }

  try {
    const aiMessage = await getAIResponse(message);
    res.json({ message: aiMessage });
  } catch (error) {
    console.error('Error in chatController:', error);
    res.status(500).json({ message: 'Error communicating with AI service.' });
  }
};
