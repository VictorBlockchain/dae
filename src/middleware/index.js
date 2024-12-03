import { session } from 'telegraf';
import logger from '../utils/logger.js';
import { MESSAGES } from '../config/constants.js';
import walletStorage from '../services/wallet/storage.js';

export function setupMiddleware(bot) {
  // Session middleware with proper initialization
  bot.use(session({
    defaultSession: () => ({
      wallet: null,
      awaitingInput: null,
      awaitingAdminInput: null,
      trading: {
        isAutoTrading: false,
        copyAddress: null,
        lastTransaction: null
      }
    })
  }));

  // Restore wallet from storage
  bot.use(async (ctx, next) => {
    if (ctx.from && !ctx.session?.wallet && walletStorage.hasWallet(ctx.from.id)) {
      try {
        ctx.session = ctx.session || {};
        ctx.session.wallet = await walletStorage.getWallet(ctx.from.id);
      } catch (error) {
        logger.error('Error restoring wallet from storage:', error);
      }
    }
    return next();
  });

  // Logging middleware
  bot.use(async (ctx, next) => {
    const start = Date.now();
    try {
      await next();
      const ms = Date.now() - start;
      logger.info(`Processing update ${ctx.update?.update_id} took ${ms}ms`);
    } catch (error) {
      logger.error('Middleware error:', error);
      ctx.reply(MESSAGES.ERROR.GENERAL).catch(e => 
        logger.error('Error sending error message:', e)
      );
    }
  });

  // Error handling middleware
  bot.catch((err, ctx) => {
    logger.error('Bot error:', err);
    ctx.reply(MESSAGES.ERROR.GENERAL).catch(e => 
      logger.error('Error sending error message:', e)
    );
  });
}