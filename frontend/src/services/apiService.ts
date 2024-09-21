/* eslint-disable @typescript-eslint/no-explicit-any */
// services/apiService.ts

import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
});

export const sendMessage = async (message: string): Promise<string> => {
  try {
    const response = await apiClient.post<{ message: string }>('/chat', { message });
    return response.data.message;
  } catch (error: any) {
    console.error('Error in apiService:', error);
    throw new Error(error.response?.data?.message || 'Failed to communicate with the server.');
  }
};
