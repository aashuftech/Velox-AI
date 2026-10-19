import path from 'path';
import { fileURLToPath } from 'url';
import { once } from 'events';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure backend/.env is loaded reliably regardless of current working directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Claim the port first so a duplicate instance fails before opening DB retries.
  const server = app.listen(PORT);

  try {
    await once(server, 'listening');
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(
        `[Server] Port ${PORT} is already in use. Another backend may be running; inspect the owner and stop it only if it is yours.`
      );
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  server.on('error', (error) => {
    console.error(`[Server] Listener error: ${error.message}`);
    process.exitCode = 1;
  });

  console.log(`[Server] Velox AI Backend listening on http://localhost:${PORT}`);
  console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);

  // Keep the API available while Atlas reconnects, as before.
  await connectDB();
};

startServer().catch((error) => {
  console.error(`[Server] Startup failed: ${error.message}`);
  process.exitCode = 1;
});
