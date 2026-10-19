import { getDBStatus } from '../config/db.js';

const READY_STATE_MAP = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

export const checkHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const readyStateText = READY_STATE_MAP[dbStatus.readyState] || 'unknown';

  const hasGemini = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
  );
  const hasOpenAi = Boolean(
    process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'
  );

  let activeAIProvider = 'Fallback Simulator';
  if (hasGemini) {
    activeAIProvider = 'Google Gemini (Live)';
  } else if (hasOpenAi) {
    activeAIProvider = 'OpenAI (Live)';
  }

  return res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      readyState: dbStatus.readyState,
      status: readyStateText,
      storageMode: dbStatus.connected ? 'mongodb' : 'disconnected',
      persistenceNotice: dbStatus.connected
        ? 'Active MongoDB Atlas persistence verified via Mongoose.'
        : 'MongoDB Atlas is disconnected. Real persistence requires active connection.',
      error: dbStatus.error || null,
    },
    aiProviders: {
      geminiConfigured: hasGemini,
      openAiConfigured: hasOpenAi,
      activeProvider: activeAIProvider,
      fallbackAvailable: true,
    },
  });
};
