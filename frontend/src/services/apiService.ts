/* eslint-disable @typescript-eslint/no-explicit-any */
// // services/apiService.ts

import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:5001/api",
});

export const sendMessage = async (message: string): Promise<string> => {
  try {
    const response = await apiClient.post<{ message: string }>("/chat", {
      message,
    });
    return response.data.message;
  } catch (error: any) {
    console.error("Error in apiService:", error);
    throw new Error(
      error.response?.data?.message || "Failed to communicate with the server."
    );
  }
};

/**
 * Sends a chat message to the specified endpoint.
 * @param message - The user's question.
 * @param model - The AI model to use (e.g., 'gpt-4', 'gpt-3.5-turbo').
 * @param endpoint - The API endpoint to send the message to.
 * @returns The AI's response as a string.
 */
export const sendChatMessage = async (
  message: string,
  model: string = "gpt-4",
  endpoint: string = "/sql-chat"
): Promise<string> => {
  try {
    const response = await axios.post(endpoint, {
      message,
      model,
    });
    return response.data.response; // Ensure backend returns { response: string }
  } catch (error: any) {
    console.error("API Error:", error);
    throw new Error(
      error.response?.data?.message || "Failed to communicate with the server."
    );
  }
};
