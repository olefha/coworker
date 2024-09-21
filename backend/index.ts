// index.ts

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import portfinder from 'portfinder';

import chatRoutes from './routes/chatRoutes';

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
app.use('/api', chatRoutes);

// Start the server
const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);
portfinder.basePort = DEFAULT_PORT;

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
