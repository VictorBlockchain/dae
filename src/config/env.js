import { cleanEnv, str } from 'envalid';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// Generate encryption key if not provided
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  logger.warn('No ENCRYPTION_KEY provided, generated random key. Stored wallets will be lost on restart!');
}

export function validateEnv() {
  try {
    const env = cleanEnv(process.env, {
      TELEGRAM_BOT_TOKEN: str({
        desc: 'Telegram Bot Token from BotFather'
      }),
      ADMIN_TELEGRAM_USERNAME: str({
        desc: 'Telegram username of the admin'
      }),
      ADMIN_WALLET_ADDRESS: str({
        desc: 'Solana wallet address of the admin',
        regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
      }),
      SERVICE_FEE_WALLET: str({
        desc: 'Wallet address for collecting service fees',
        regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
      }),
      SOLANA_RPC_URL: str({
        desc: 'Solana RPC URL'
      }),
      ENCRYPTION_KEY: str({
        desc: 'Key for encrypting wallet data'
      })
    });

    return env;
  } catch (error) {
    logger.error('Environment validation failed:', error);
    throw new Error(`Environment validation failed: ${error.message}`);
  }
}