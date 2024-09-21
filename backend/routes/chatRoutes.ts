// routes/chatRoutes.ts

import { Router } from 'express';
import { handleChat } from '../controllers/chatController';

const router = Router();

router.post('/chat', handleChat);

export default router;
