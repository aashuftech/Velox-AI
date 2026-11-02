import { Router } from 'express';
import {
  sendGuestMessage,
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  deleteConversation,
  renameConversation,
} from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public guest chat endpoint (messages are NOT saved to MongoDB)
router.post('/chat/guest', sendGuestMessage);

// Protect all conversation routes with JWT authentication
router.use('/conversations', requireAuth);

router.get('/conversations', getConversations);
router.post('/conversations', createConversation);
router.patch('/conversations/:conversationId', renameConversation);
router.delete('/conversations/:conversationId', deleteConversation);

router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

export default router;
