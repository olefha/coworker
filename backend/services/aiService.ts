// services/aiService.ts

import axios from 'axios';

export const getAIResponse = async (userMessage: string): Promise<string> => {
  try {
    const aiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4', // or 'gpt-3.5-turbo'
        messages: [{ role: 'user', content: userMessage }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );

    const aiMessage =
      aiResponse.data.choices[0].message?.content.trim() || 'No response from AI.';
    return aiMessage;
  } catch (error) {
    console.error('Error in aiService:', error);
    throw new Error('Failed to get response from AI service.');
  }
};
