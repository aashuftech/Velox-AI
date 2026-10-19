import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { getDBStatus } from '../config/db.js';
import { generateAIResponse } from '../services/ai.service.js';

/**
 * Helper to ensure MongoDB Atlas connection is active.
 * Fails fast with clear 503 instead of silently using in-memory storage.
 */
const ensureDatabaseConnected = (res) => {
  const { connected } = getDBStatus();
  if (!connected) {
    res.status(503).json({
      success: false,
      message:
        'Database unavailable: MongoDB Atlas is not connected. Please verify your Atlas connection.',
      database: 'disconnected',
    });
    return false;
  }
  return true;
};

/**
 * GET /api/conversations
 * Retrieve all real conversations from MongoDB Atlas
 */
export const getConversations = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const conversations = await Conversation.find().sort({ updatedAt: -1 });
    return res.status(200).json({
      success: true,
      data: conversations,
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversations from database',
      error: error.message,
    });
  }
};

/**
 * POST /api/conversations
 * Create a new conversation in MongoDB Atlas
 */
export const createConversation = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { title } = req.body || {};

    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Title must be a valid string',
      });
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    if (trimmedTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Conversation title cannot exceed 150 characters',
      });
    }

    const conversationTitle = trimmedTitle || 'New Chat';
    const newConv = await Conversation.create({ title: conversationTitle });

    return res.status(201).json({
      success: true,
      data: newConv,
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create conversation in database',
      error: error.message,
    });
  }
};

/**
 * GET /api/conversations/:conversationId/messages
 * Retrieve messages for a given conversation from MongoDB Atlas
 */
export const getMessages = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { conversationId } = req.params;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format for MongoDB',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve messages from database',
      error: error.message,
    });
  }
};

/**
 * POST /api/conversations/:conversationId/messages
 * Save user message, query Gemini AI, and save assistant response to MongoDB Atlas
 */
export const sendMessage = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { conversationId } = req.params;
    const { text } = req.body || {};

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format for MongoDB',
      });
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required and must be a non-empty string',
      });
    }

    const trimmedText = text.trim();
    if (trimmedText.length > 10000) {
      return res.status(400).json({
        success: false,
        message: 'Message text exceeds maximum length of 10,000 characters',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // 1. Persist user message in MongoDB Atlas
    const userMessage = await Message.create({
      conversationId,
      sender: 'user',
      text: trimmedText,
    });

    // 2. Fetch recent conversation history to provide conversational context
    const historyDocs = await Message.find({
      conversationId,
      _id: { $ne: userMessage._id },
    })
      .sort({ createdAt: -1 })
      .limit(10);
    const existingHistory = historyDocs.map((m) => ({
      sender: m.sender,
      text: m.text,
    })).reverse();

    // 3. Generate AI response via Gemini
    const aiResult = await generateAIResponse(trimmedText, existingHistory);

    // 4. Persist AI assistant message in MongoDB Atlas
    const assistantMessage = await Message.create({
      conversationId,
      sender: 'assistant',
      text: aiResult.text,
    });

    // 5. Update conversation timestamp and set title if default
    const updatePayload = { updatedAt: new Date() };
    if (conversation.title === 'New Chat') {
      updatePayload.title = trimmedText.slice(0, 36);
    }
    await Conversation.findByIdAndUpdate(conversationId, updatePayload);

    return res.status(201).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
      },
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(error.provider ? 502 : 500).json({
      success: false,
      message: error.provider
        ? 'AI provider failed to generate a response'
        : 'Failed to process message in database',
      error: error.message,
      provider: error.provider || undefined,
    });
  }
};

/**
 * DELETE /api/conversations/:conversationId
 * Permanently delete a conversation and its messages from MongoDB Atlas
 */
export const deleteConversation = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { conversationId } = req.params;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format for MongoDB',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Delete all messages and the conversation from MongoDB Atlas
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    return res.status(200).json({
      success: true,
      message: 'Conversation and messages permanently deleted from MongoDB Atlas',
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete conversation from database',
      error: error.message,
    });
  }
};
