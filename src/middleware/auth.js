import logger from '../utils/logger.js';

export function isAdmin(ctx) {
  try {
    const username = ctx.from?.username;
    const adminUsername = process.env.ADMIN_TELEGRAM_USERNAME;

    if (!username || !adminUsername) {
      logger.error('Missing username or admin configuration');
      return false;
    }

    return username.toLowerCase() === adminUsername.toLowerCase();
  } catch (error) {
    logger.error('Error checking admin status:', error);
    return false;
  }
}

export function adminMiddleware(ctx, next) {
  if (isAdmin(ctx)) {
    return next();
  }
  ctx.reply('This command is only available to administrators.');
}