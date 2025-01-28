// routes/questionRoute.ts

import express, { Request, Response } from "express";
import { handleUserQuestion } from "../sol1/src/index";

const router = express.Router();

router.post("/ask-question", async (req: Request, res: Response) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res
      .status(400)
      .json({ error: 'Invalid or missing "question" in request body.' });
  }

  try {
    const answer = await handleUserQuestion(question);
    res.json({ answer });
  } catch (error) {
    console.error("Error handling user question:", error);
    res
      .status(500)
      .json({ error: "An error occurred while processing your question." });
  }
});

export default router;
