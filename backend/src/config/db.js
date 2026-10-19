import mongoose from 'mongoose';

let isConnected = false;
let lastConnectionError = null;
let retryTimer = null;

const scheduleReconnect = () => {
  if (retryTimer) {
    return;
  }

  retryTimer = setTimeout(() => {
    retryTimer = null;
    connectDB();
  }, 10000);
};

// Mask credentials from URI string for safe logging
const getMaskedUri = (uri) => {
  try {
    return uri.replace(/\/\/[^/@]*@/, '//[credentials-hidden]@');
  } catch {
    return 'mongodb://[credentials-hidden]';
  }
};

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chatbot';
  const maskedUri = getMaskedUri(uri);

  try {
    const conn = await mongoose.connect(uri, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    lastConnectionError = null;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    console.log(`[Database] MongoDB Atlas Connected: ${conn.connection.host}`);
  } catch (error) {
    isConnected = false;
    lastConnectionError = error.message;

    console.warn(
      `[Database] Warning: Could not connect to MongoDB Atlas at ${maskedUri}. ` +
        `Details: ${error.message}`
    );

    scheduleReconnect();
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB Atlas disconnected. Retrying...');
  scheduleReconnect();
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  lastConnectionError = null;
  console.log('[Database] MongoDB Atlas reconnected.');
});

export const getDBStatus = () => {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    error: lastConnectionError,
  };
};
