import { generateWallet, importWallet, getSOLBalance } from '../services/wallet/index.js';
import walletStorage from '../services/wallet/storage.js';
import { MESSAGES } from '../config/constants.js';
import logger from '../utils/logger.js';

export function setupWalletCommands(bot) {
  // Generate new wallet
  bot.command('generate_wallet', async (ctx) => {
    try {
      const loadingMsg = await ctx.reply('🔄 Generating new wallet...');
      
      // Check if user already has a wallet
      const hasWallet = await walletStorage.hasWallet(ctx.from.id);
      if (hasWallet) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          '⚠️ You already have a wallet. Use /wallet_info to view your current wallet or /remove_wallet to remove it first.'
        );
        return;
      }
      
      const wallet = await generateWallet();
      const success = await walletStorage.setWallet(ctx.from.id, wallet);
      
      if (!success) {
        throw new Error('Failed to save wallet');
      }
      
      ctx.session = ctx.session || {};
      ctx.session.wallet = wallet;
      
      const balance = await getSOLBalance(wallet.publicKey);
      const message = 
        `✅ New wallet generated!\n\n` +
        `Address: ${wallet.publicKey}\n` +
        `Balance: ${balance.toFixed(6)} SOL\n\n` +
        `⚠️ Use /export_key to reveal your private key securely`;
      
      await ctx.telegram.editMessageText(
        ctx.chat.id, 
        loadingMsg.message_id,
        null,
        message
      );
      
      logger.info(`Wallet generated for user ${ctx.from.id}`);
    } catch (error) {
      logger.error('Error generating wallet:', error);
      await ctx.reply(MESSAGES.ERROR.WALLET);
    }
  });

  // Import wallet
  bot.command('import_wallet', async (ctx) => {
    try {
      // Check if user already has a wallet
      const hasWallet = await walletStorage.hasWallet(ctx.from.id);
      if (hasWallet) {
        await ctx.reply(
          '⚠️ You already have a wallet. Use /wallet_info to view your current wallet or /remove_wallet to remove it first.'
        );
        return;
      }

      const message = await ctx.reply(
        '🔐 Enter your private key to import wallet:\n\n' +
        '⚠️ WARNING: Never share your private key with anyone!\n' +
        'This message will be deleted in 60 seconds.'
      );
      
      ctx.session = ctx.session || {};
      ctx.session.awaitingInput = 'import_wallet';
      ctx.session.importMessageId = message.message_id;

      // Delete the prompt message after 60 seconds
      setTimeout(async () => {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch (error) {
          logger.error('Error deleting import prompt:', error);
        }
      }, 60000);
    } catch (error) {
      logger.error('Error initiating wallet import:', error);
      await ctx.reply(MESSAGES.ERROR.WALLET);
    }
  });

  // Handle wallet import
  bot.on('text', async (ctx, next) => {
    if (ctx.session?.awaitingInput !== 'import_wallet') {
      return next();
    }

    try {
      // Delete user's message containing private key
      await ctx.deleteMessage();

      // Delete the prompt message if it still exists
      if (ctx.session.importMessageId) {
        try {
          await ctx.deleteMessage(ctx.session.importMessageId);
        } catch (error) {
          logger.error('Error deleting import prompt:', error);
        }
      }

      const loadingMsg = await ctx.reply('🔄 Importing wallet...');

      // Check again if user already has a wallet (race condition protection)
      const hasWallet = await walletStorage.hasWallet(ctx.from.id);
      if (hasWallet) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          '⚠️ You already have a wallet. Use /wallet_info to view your current wallet or /remove_wallet to remove it first.'
        );
        return;
      }

      const wallet = await importWallet(ctx.message.text);
      const success = await walletStorage.setWallet(ctx.from.id, wallet);
      
      if (!success) {
        throw new Error('Failed to save wallet');
      }

      ctx.session.wallet = wallet;

      const balance = await getSOLBalance(wallet.publicKey);
      
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        `✅ Wallet imported successfully!\n\n` +
        `Address: ${wallet.publicKey}\n` +
        `Balance: ${balance.toFixed(6)} SOL\n\n` +
        `Use /wallet_settings to manage your wallet`
      );

      logger.info(`Wallet imported for user ${ctx.from.id}`);
    } catch (error) {
      logger.error('Error importing wallet:', error);
      await ctx.reply('❌ Failed to import wallet: ' + error.message);
    } finally {
      ctx.session.awaitingInput = null;
      ctx.session.importMessageId = null;
    }
  });

  // Wallet info command
  bot.command('wallet_info', async (ctx) => {
    try {
      const wallet = await walletStorage.getWallet(ctx.from.id);
      if (!wallet) {
        return ctx.reply('No wallet found. Use /generate_wallet to create one or /import_wallet to import existing.');
      }

      const balance = await getSOLBalance(wallet.publicKey);
      await ctx.reply(
        '💰 Wallet Information\n\n' +
        `Address: ${wallet.publicKey}\n` +
        `Balance: ${balance.toFixed(6)} SOL\n\n` +
        'Commands:\n' +
        '/export_key - Reveal private key\n' +
        '/remove_wallet - Remove this wallet'
      );
    } catch (error) {
      logger.error('Error getting wallet info:', error);
      await ctx.reply(MESSAGES.ERROR.WALLET);
    }
  });

  // Remove wallet command
  bot.command('remove_wallet', async (ctx) => {
    try {
      const hasWallet = await walletStorage.hasWallet(ctx.from.id);
      if (!hasWallet) {
        return ctx.reply('No wallet found to remove.');
      }

      const success = await walletStorage.removeWallet(ctx.from.id);
      if (!success) {
        throw new Error('Failed to remove wallet');
      }

      ctx.session = ctx.session || {};
      ctx.session.wallet = null;
      
      await ctx.reply(
        '✅ Wallet removed successfully.\n\n' +
        'Use /generate_wallet to create a new one or /import_wallet to import existing.'
      );
    } catch (error) {
      logger.error('Error removing wallet:', error);
      await ctx.reply(MESSAGES.ERROR.WALLET);
    }
  });

  // Export private key command
  bot.command('export_key', async (ctx) => {
    try {
      const wallet = await walletStorage.getWallet(ctx.from.id);
      if (!wallet) {
        return ctx.reply('No wallet found. Use /generate_wallet to create one or /import_wallet to import existing.');
      }

      const message = await ctx.reply(
        '🔐 Your Private Key:\n\n' +
        `${wallet.secretKey}\n\n` +
        '⚠️ WARNING: Never share your private key with anyone!\n' +
        'This message will be deleted in 30 seconds for security.'
      );

      // Delete the message after 30 seconds
      setTimeout(async () => {
        try {
          await ctx.deleteMessage(message.message_id);
        } catch (error) {
          logger.error('Error deleting private key message:', error);
        }
      }, 30000);
    } catch (error) {
      logger.error('Error exporting private key:', error);
      await ctx.reply(MESSAGES.ERROR.WALLET);
    }
  });
}