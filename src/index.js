import 'dotenv/config';
import { Telegraf } from 'telegraf';
import nodeCleanup from 'node-cleanup';
import { setupCommands } from './commands/index.js';
import { setupMiddleware } from './middleware/index.js';
import logger from './utils/logger.js';
import { validateEnv } from './config/env.js';
import { initializeConnection } from './config/solana.js';
import { setBotInstance, getBotInstance, clearBotInstance } from './utils/botInstance.js';
import walletStorage from './services/wallet/storage.js';
import { Buffer } from 'buffer';
import fetch from 'cross-fetch';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';

// Ensure Buffer and fetch are available globally
globalThis.Buffer = Buffer;
globalThis.fetch = fetch;

async function startBot() {
  try {
    // Create data directory if it doesn't exist
    await mkdir('.data', { recursive: true });
    logger.info('Data directory initialized');

    // Validate environment variables
    validateEnv();
    logger.info('Environment validation successful');

    // Initialize wallet storage
    await walletStorage.init();
    logger.info('Wallet storage initialized');

    // Initialize Solana connection
    const connected = await initializeConnection();
    if (!connected) {
      throw new Error('Failed to establish Solana connection');
    }

    // Initialize bot
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    setBotInstance(bot);
    
    // Setup middleware
    setupMiddleware(bot);
    
    // Setup commands
    setupCommands(bot);
    
    // Start bot
    await bot.launch({
      dropPendingUpdates: true
    });
    
    logger.info('Bot started successfully');
    
  } catch (error) {
    logger.error('Error starting bot:', error);
    process.exit(1);
  }
}

// Handle cleanup
nodeCleanup((exitCode, signal) => {
  const bot = getBotInstance();
  if (bot) {
    bot.stop(signal);
    clearBotInstance();
    logger.info('Bot stopped');
  }
  return true;
});

// Start the bot
startBot();