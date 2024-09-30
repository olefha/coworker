/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { createSQLChain } from "../services/sqlChainService";

const modelChains: { [key: string]: any } = {};

export const handleSQLChat = async (req: Request, res: Response) => {
  const { message, model } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Invalid message provided." });
  }

  const selectedModel = model || "gpt-4";

  try {
    // Initialize the chain for the selected model if not already done
    if (!modelChains[selectedModel]) {
      modelChains[selectedModel] = await createSQLChain(selectedModel);
      console.log(`Initialized SQL Chain for model: ${selectedModel}`);
    }

    const chain = modelChains[selectedModel];

    // Invoke the chain with the user's question
    const response = await chain.invoke({ question: message });
    console.log(response);

    res.json({ response });
  } catch (error: any) {
    console.error("Error in SQL Chat Controller:", error);
    res.status(500).json({ message: "Error processing your request." });
  }
};
