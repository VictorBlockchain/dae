import { validateEnv } from '../config/env.js';
import logger from '../utils/logger.js';

try {
  const env = validateEnv();
  logger.info('Environment validation successful!');
  logger.info('Validated configuration:', {
    network: env.SOLANA_NETWORK,
    admin: env.ADMIN_TELEGRAM_USERNAME,
    serviceFeeWallet: env.SERVICE_FEE_WALLET
  });
  process.exit(0);
} catch (error) {
  logger.error('Environment validation failed:', error);
  process.exit(1);
}