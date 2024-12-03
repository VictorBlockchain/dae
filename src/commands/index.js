import { setupWalletCommands } from './wallet.js';
import { setupTradingCommands } from './trading.js';
import { setupAdminCommands } from './admin.js';
import { isAdmin } from '../middleware/auth.js';
import { MESSAGES } from '../config/constants.js';
import { COMMANDS, COMMAND_DESCRIPTIONS } from '../config/commands.js';
import logger from '../utils/logger.js';

export function setupCommands(bot) {
  // Start command
  bot.command(COMMANDS.START, async (ctx) => {
    try {
      const isAdminUser = isAdmin(ctx);
      const message = MESSAGES.WELCOME;
      
      if (isAdminUser) {
        const adminCommands = '\n👑 Admin Commands:\n' +
          `/admin - Shows the admin control panel\n` +
          `/set_fee - Set service fee\n` +
          `/set_focus_token - Set focus token\n` +
          `/toggle_focus - Toggle focus mode`;
        
        await ctx.reply(message + adminCommands);
      } else {
        await ctx.reply(message);
      }
    } catch (error) {
      logger.error('Error in start command:', error);
      await ctx.reply(MESSAGES.ERROR.GENERAL);
    }
  });

  // Setup command modules
  setupWalletCommands(bot);
  setupTradingCommands(bot);
  setupAdminCommands(bot);

  // Register commands with descriptions
  const commands = [
    { command: COMMANDS.START, description: COMMAND_DESCRIPTIONS[COMMANDS.START] },
    { command: COMMANDS.IMPORT_WALLET, description: COMMAND_DESCRIPTIONS[COMMANDS.IMPORT_WALLET] },
    { command: COMMANDS.WALLET_INFO, description: COMMAND_DESCRIPTIONS[COMMANDS.WALLET_INFO] },
    { command: COMMANDS.AUTO_BUY_RAYDIUM, description: COMMAND_DESCRIPTIONS[COMMANDS.AUTO_BUY_RAYDIUM] },
    { command: COMMANDS.AUTO_BUY_PUMPFUN, description: COMMAND_DESCRIPTIONS[COMMANDS.AUTO_BUY_PUMPFUN] },
    { command: COMMANDS.MANUAL_BUY_RAYDIUM, description: COMMAND_DESCRIPTIONS[COMMANDS.MANUAL_BUY_RAYDIUM] },
    { command: COMMANDS.MANUAL_BUY_PUMPFUN, description: COMMAND_DESCRIPTIONS[COMMANDS.MANUAL_BUY_PUMPFUN] },
    { command: COMMANDS.SET_SLIPPAGE, description: COMMAND_DESCRIPTIONS[COMMANDS.SET_SLIPPAGE] },
    { command: COMMANDS.REFRESH_BALANCE, description: COMMAND_DESCRIPTIONS[COMMANDS.REFRESH_BALANCE] },
    { command: COMMANDS.SELL_ALL, description: COMMAND_DESCRIPTIONS[COMMANDS.SELL_ALL] },
    { command: COMMANDS.STOP_TRADING, description: COMMAND_DESCRIPTIONS[COMMANDS.STOP_TRADING] },
    { command: COMMANDS.TRADE_STATUS, description: COMMAND_DESCRIPTIONS[COMMANDS.TRADE_STATUS] }
  ];

  bot.telegram.setMyCommands(commands).catch(error => {
    logger.error('Error setting commands:', error);
  });
}