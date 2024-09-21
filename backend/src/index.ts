// backend/src/index.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import portfinder from 'portfinder';
import { inputSchema } from './validation';
import { InputRequest, InputResponse } from './types';



dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin: 'http://localhost:5173', // Adjust if frontend runs on a different port
  })
);
app.use(express.json());

// Routes
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Hello from the backend!' });
});

// New POST endpoint to receive input
// backend/src/index.ts


// eslint-disable-next-line @typescript-eslint/no-empty-object-type
app.post('/api/input', (req: Request<{}, {}, InputRequest>, res: Response<InputResponse>) => {
  const { error, value } = inputSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { input } = value;

  // Process the input as needed. Here, we'll just echo it back.
  const processedInput = input.trim().toUpperCase(); // Example processing

  res.json({ message: `Received and processed input: ${processedInput}` });
});


// Configure portfinder
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);
portfinder.basePort = DEFAULT_PORT; // Starting port

portfinder
  .getPortPromise()
  .then((port) => {
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('Could not find an available port:', err);
    process.exit(1);
  });
