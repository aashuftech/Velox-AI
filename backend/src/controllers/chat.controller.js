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
 * POST /api/chat/guest
 * Generates an AI response for guest users WITHOUT saving conversations to MongoDB.
 */
export const sendGuestMessage = async (req, res) => {
  try {
    const { text, history = [] } = req.body || {};

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

    // Format previous in-memory conversational history for Gemini
    const sanitizedHistory = Array.isArray(history)
      ? history.map((m) => ({
          sender: m.sender === 'user' ? 'user' : 'assistant',
          text: typeof m.text === 'string' ? m.text : '',
        }))
      : [];

    const aiResult = await generateAIResponse(trimmedText, sanitizedHistory);

    const userMessage = {
      _id: `guest-user-${Date.now()}`,
      sender: 'user',
      text: trimmedText,
      createdAt: new Date().toISOString(),
    };

    const assistantMessage = {
      _id: `guest-assistant-${Date.now()}`,
      sender: 'assistant',
      text: aiResult.text,
      createdAt: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: {
        userMessage,
        assistantMessage,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
      },
      storage: 'in-memory-guest',
    });
  } catch (error) {
    return res.status(error.provider ? 502 : 500).json({
      success: false,
      message: error.provider
        ? 'AI provider failed to generate a response'
        : 'Failed to process guest message',
      error: error.message,
      provider: error.provider || undefined,
    });
  }
};

/**
 * GET /api/conversations
 * Retrieve all real conversations belonging to the authenticated user from MongoDB Atlas
 */
export const getConversations = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const conversations = await Conversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });
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
 * Create a new conversation associated with the authenticated user in MongoDB Atlas
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
    const newConv = await Conversation.create({
      title: conversationTitle,
      userId: req.user._id,
    });

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

    // Authorization check: User must own the conversation
    if (conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this conversation',
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

    // Authorization check: User must own the conversation
    if (conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this conversation',
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

    // 5. Update conversation timestamp and set title if default and not custom renamed
    const updatePayload = { updatedAt: new Date() };
    if (conversation.title === 'New Chat' && !conversation.isCustomTitle) {
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

    // Authorization check: User must own the conversation
    if (conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this conversation',
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

/**
 * PATCH /api/conversations/:conversationId
 * Rename a conversation owned by the authenticated user in MongoDB Atlas
 */
export const renameConversation = async (req, res) => {
  try {
    if (!ensureDatabaseConnected(res)) return;

    const { conversationId } = req.params;
    const { title } = req.body || {};

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID format for MongoDB',
      });
    }

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and cannot be empty',
      });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length > 150) {
      return res.status(400).json({
        success: false,
        message: 'Conversation title cannot exceed 150 characters',
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found',
      });
    }

    // Authorization check: User must own the conversation
    if (conversation.userId && conversation.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this conversation',
      });
    }

    conversation.title = trimmedTitle;
    conversation.isCustomTitle = true;
    await conversation.save();

    return res.status(200).json({
      success: true,
      message: 'Conversation renamed successfully',
      data: conversation,
      storage: 'mongodb',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to rename conversation in database',
      error: error.message,
    });
  }
};
