import { adminMiddleware, isAdmin } from '../middleware/auth.js';
import adminService from '../services/admin/index.js';
import { MESSAGES } from '../config/constants.js';
import logger from '../utils/logger.js';

export function setupAdminCommands(bot) {
  // Admin menu command
  bot.command('admin', adminMiddleware, async (ctx) => {
    try {
      const currentFee = adminService.getServiceFee();
      const focusToken = adminService.getFocusToken();
      const focusMode = adminService.isFocusModeEnabled();

      const message = 
        '👑 Admin Control Panel\n\n' +
        `Current Settings:\n` +
        `• Service Fee: ${currentFee} SOL\n` +
        `• Focus Token: ${focusToken || 'Not set'}\n` +
        `• Focus Mode: ${focusMode ? '✅ Enabled' : '❌ Disabled'}\n\n` +
        'Available Commands:\n' +
        '/set_fee - Set service fee in SOL\n' +
        '/set_focus_token - Set focus token address\n' +
        '/toggle_focus - Toggle focus mode';

      await ctx.reply(message);
    } catch (error) {
      logger.error('Error displaying admin menu:', error);
      await ctx.reply(MESSAGES.ERROR.ADMIN);
    }
  });

  // Set service fee
  bot.command('set_fee', adminMiddleware, async (ctx) => {
    try {
      await ctx.reply(
        'Enter new service fee in SOL (e.g., 0.004):\n\n' +
        'Note: This is a fixed fee per transaction, not a percentage.'
      );
      ctx.session = ctx.session || {};
      ctx.session.awaitingAdminInput = 'set_fee';
    } catch (error) {
      logger.error('Error initiating fee setting:', error);
      await ctx.reply(MESSAGES.ERROR.ADMIN);
    }
  });

  // Set focus token
  bot.command('set_focus_token', adminMiddleware, async (ctx) => {
    try {
      await ctx.reply(
        'Enter token address for focus mode:\n\n' +
        'Note: This token will be used for all auto-trading bots when focus mode is enabled.'
      );
      ctx.session = ctx.session || {};
      ctx.session.awaitingAdminInput = 'set_focus_token';
    } catch (error) {
      logger.error('Error initiating focus token setting:', error);
      await ctx.reply(MESSAGES.ERROR.ADMIN);
    }
  });

  // Toggle focus mode
  bot.command('toggle_focus', adminMiddleware, async (ctx) => {
    try {
      const focusToken = adminService.getFocusToken();
      if (!focusToken) {
        return ctx.reply('⚠️ Please set a focus token first using /set_focus_token');
      }

      const enabled = adminService.toggleFocusMode();
      await ctx.reply(
        `Focus mode ${enabled ? '✅ enabled' : '❌ disabled'}\n` +
        `${enabled ? `\nAll auto-trading bots will now trade only:\n${focusToken}` : ''}`
      );
    } catch (error) {
      logger.error('Error toggling focus mode:', error);
      await ctx.reply('Error toggling focus mode. Please try again.');
    }
  });

  // Handle admin text inputs
  bot.on('text', async (ctx, next) => {
    if (!ctx.session?.awaitingAdminInput || !isAdmin(ctx)) {
      return next();
    }

    try {
      const input = ctx.message.text.trim();

      switch (ctx.session.awaitingAdminInput) {
        case 'set_fee': {
          try {
            adminService.setServiceFee(input);
            await ctx.reply(`✅ Service fee set to ${input} SOL per transaction`);
          } catch (error) {
            await ctx.reply('❌ Invalid fee amount. Please enter a number between 0 and 1 SOL');
          }
          break;
        }

        case 'set_focus_token': {
          try {
            adminService.setFocusToken(input);
            await ctx.reply(
              `✅ Focus token set to:\n${input}\n\n` +
              'Use /toggle_focus to enable/disable focus mode'
            );
          } catch (error) {
            await ctx.reply('❌ Invalid token address. Please try again.');
          }
          break;
        }
      }
    } catch (error) {
      logger.error('Error handling admin input:', error);
      await ctx.reply('Error processing admin command. Please try again.');
    } finally {
      ctx.session.awaitingAdminInput = null;
    }
  });
}