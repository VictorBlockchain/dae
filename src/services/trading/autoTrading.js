import schedule from 'node-schedule';
import logger from '../../utils/logger.js';
import jupiterService from './jupiter.js';
import pumpfunService from './pumpfun.js';
import { getSOLBalance } from '../wallet/balance.js';
import { getTokenBalance } from '../wallet/tokenBalance.js';
import adminService from '../admin/index.js';
import { getBotInstance } from '../../utils/botInstance.js';
import tokenInfoService from './tokenInfo.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const MIN_SOL_BALANCE = 0.015; // Minimum SOL balance to maintain
const MIN_SOL_FOR_FEES = 0.000005; // Minimum SOL needed for network fees

class AutoTradingService {
  constructor() {
    this.jobs = new Map();
    this.trades = new Map();
    this.chatIds = new Map();
    this.lastMessageIds = new Map();
  }

  async sellAllTokens(userId, wallet, tokenAddress, tokenBalance, exchange = 'raydium') {
    try {
      if (exchange === 'raydium') {
        return await jupiterService.executeSwap(
          wallet,
          tokenAddress,
          SOL_MINT,
          tokenBalance.amount,
          userId,
          true // Increase slippage for urgent sells
        );
      } else {
        return await pumpfunService.executeSwap(
          wallet,
          tokenAddress,
          tokenBalance.amount,
          'sell',
          userId,
          false
        );
      }
    } catch (error) {
      logger.error(`Error selling tokens for user ${userId}:`, error);
      throw error;
    }
  }

  async startTrading(userId, wallet, amount, interval, tokenAddress, chatId, exchange = 'raydium') {
    try {
      if (this.jobs.has(userId)) {
        await this.stopTrading(userId);
      }

      // Store chat ID and trade info
      this.chatIds.set(userId, chatId);
      this.trades.set(userId, {
        tokenAddress,
        amount,
        interval,
        startTime: Date.now(),
        wallet,
        exchange
      });

      const bot = getBotInstance();
      const loadingMsg = await bot.telegram.sendMessage(chatId, '🔄 Checking balances...');

      // Check initial balances
      const [solBalance, tokenBalance] = await Promise.all([
        getSOLBalance(wallet.publicKey),
        getTokenBalance(wallet.publicKey, tokenAddress)
      ]);

      const serviceFee = adminService.getServiceFee();
      const requiredAmount = amount + serviceFee + MIN_SOL_FOR_FEES;

      // Check if we need to sell tokens first
      if (solBalance - requiredAmount < MIN_SOL_BALANCE && tokenBalance.amount !== '0') {
        await bot.telegram.editMessageText(
          chatId,
          loadingMsg.message_id,
          null,
          '⚠️ Low SOL balance detected. Selling existing tokens first...'
        );

        try {
          const sellResult = await this.sellAllTokens(userId, wallet, tokenAddress, tokenBalance, exchange);
          const newBalance = await getSOLBalance(wallet.publicKey);
          const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress);

          await bot.telegram.editMessageText(
            chatId,
            loadingMsg.message_id,
            null,
            '✅ Successfully sold existing tokens\n\n' +
            `Amount Sold: ${tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals)} ${tokenInfo.symbol}\n` +
            `SOL Received: ${(sellResult.outputAmount / 1e9).toFixed(6)} SOL\n` +
            `New Balance: ${newBalance.toFixed(6)} SOL\n\n` +
            'Proceeding with initial trade...'
          );

          // Wait for blockchain state to update
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          logger.error('Error selling existing tokens:', error);
          throw new Error(`Failed to sell existing tokens: ${error.message}`);
        }
      }

      // Check balance again after potential sell
      const currentBalance = await getSOLBalance(wallet.publicKey);
      if (currentBalance - requiredAmount < MIN_SOL_BALANCE) {
        throw new Error(
          `Insufficient balance for trading. Minimum ${MIN_SOL_BALANCE} SOL must be maintained.\n` +
          `Required: ${requiredAmount.toFixed(6)} SOL\n` +
          `Available: ${currentBalance.toFixed(6)} SOL`
        );
      }

      await bot.telegram.editMessageText(
        chatId,
        loadingMsg.message_id,
        null,
        '🔄 Executing initial trade...'
      );

      // Execute initial trade based on exchange
      let result;
      if (exchange === 'raydium') {
        result = await jupiterService.executeSwap(
          wallet,
          SOL_MINT,
          tokenAddress,
          Math.floor(amount * 1e9),
          userId
        );
      } else {
        result = await pumpfunService.executeSwap(
          wallet,
          tokenAddress,
          amount,
          'buy',
          userId,
          true
        );
      }

      // Schedule subsequent trades
      const job = schedule.scheduleJob(`*/${interval} * * * *`, async () => {
        try {
          const tradeInfo = this.trades.get(userId);
          const userChatId = this.chatIds.get(userId);
          
          if (!tradeInfo || !userChatId) {
            logger.error(`Missing trade info or chat ID for user ${userId}`);
            return;
          }

          // Delete previous status message if exists
          const lastMessageId = this.lastMessageIds.get(userId);
          if (lastMessageId) {
            try {
              await bot.telegram.deleteMessage(userChatId, lastMessageId);
            } catch (error) {
              logger.warn('Error deleting previous message:', error);
            }
          }

          // Send new status message
          const statusMsg = await bot.telegram.sendMessage(
            userChatId,
            '🔄 Executing scheduled trade...'
          );

          // Check balances before trade
          const [currentBalance, tokenBalance] = await Promise.all([
            getSOLBalance(wallet.publicKey),
            getTokenBalance(wallet.publicKey, tokenAddress)
          ]);

          const requiredAmount = amount + serviceFee + MIN_SOL_FOR_FEES;

          // If balance is too low, try to sell tokens
          if (currentBalance < MIN_SOL_BALANCE || (currentBalance - requiredAmount) < MIN_SOL_BALANCE) {
            if (tokenBalance.amount && tokenBalance.amount !== '0') {
              await bot.telegram.editMessageText(
                userChatId,
                statusMsg.message_id,
                null,
                '⚠️ Low SOL balance detected. Selling all tokens...'
              );

              const sellResult = await this.sellAllTokens(
                userId,
                wallet,
                tokenAddress,
                tokenBalance,
                exchange
              );

              const newBalance = await getSOLBalance(wallet.publicKey);
              const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress);

              // Store message ID for future cleanup
              this.lastMessageIds.set(userId, statusMsg.message_id);

              await bot.telegram.editMessageText(
                userChatId,
                statusMsg.message_id,
                null,
                '✅ Tokens sold to maintain minimum SOL balance\n\n' +
                `Amount Sold: ${tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals)} ${tokenInfo.symbol}\n` +
                `SOL Received: ${(sellResult.outputAmount / 1e9).toFixed(6)} SOL\n` +
                `New Balance: ${newBalance.toFixed(6)} SOL\n\n` +
                'Auto trading will continue with next scheduled trade.\n\n' +
                'Actions:\n' +
                '/refresh_balance - Update balances\n' +
                '/sell_all - Sell all tokens\n' +
                '/stop_trading - Stop auto trading'
              );
              return;
            }

            // If we can't sell tokens (none available) and balance is too low, stop trading
            await this.stopTrading(userId);
            await bot.telegram.editMessageText(
              userChatId,
              statusMsg.message_id,
              null,
              '❌ Auto trading stopped: Insufficient SOL balance and no tokens to sell'
            );
            return;
          }

          // Execute trade if we have enough balance
          let tradeResult;
          if (exchange === 'raydium') {
            tradeResult = await jupiterService.executeSwap(
              wallet,
              SOL_MINT,
              tokenAddress,
              Math.floor(amount * 1e9),
              userId
            );
          } else {
            tradeResult = await pumpfunService.executeSwap(
              wallet,
              tokenAddress,
              amount,
              'buy',
              userId,
              true
            );
          }

          const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress);
          const [newSolBalance, newTokenBalance] = await Promise.all([
            getSOLBalance(wallet.publicKey),
            getTokenBalance(wallet.publicKey, tokenAddress)
          ]);

          // Store message ID for future cleanup
          this.lastMessageIds.set(userId, statusMsg.message_id);

          // Update status message with result
          await bot.telegram.editMessageText(
            userChatId,
            statusMsg.message_id,
            null,
            '✅ Scheduled trade executed!\n\n' +
            `Token: ${tokenInfo.symbol} (${tokenInfo.name})\n` +
            `Transaction: ${tradeResult.signature}\n` +
            `Amount: ${amount} SOL\n` +
            (tradeResult.outputAmount ? 
              `Tokens Received: ${tokenInfoService.formatAmount(tradeResult.outputAmount, tokenInfo.decimals)} ${tokenInfo.symbol}\n` +
              `Price Impact: ${tradeResult.priceImpact}%\n` : '') +
            '\n' +
            `Current Balances:\n` +
            `• SOL: ${newSolBalance.toFixed(6)}\n` +
            `• ${tokenInfo.symbol}: ${tokenInfoService.formatAmount(newTokenBalance.amount, tokenInfo.decimals)}\n\n` +
            'Actions:\n' +
            '/refresh_balance - Update balances\n' +
            '/sell_all - Sell all tokens\n' +
            '/stop_trading - Stop auto trading'
          );
        } catch (error) {
          logger.error(`Scheduled trade failed for user ${userId}:`, error);
          const userChatId = this.chatIds.get(userId);
          
          if (!userChatId) {
            logger.error(`Missing chat ID for user ${userId}`);
            return;
          }

          // Delete previous error message if exists
          const lastMessageId = this.lastMessageIds.get(userId);
          if (lastMessageId) {
            try {
              await bot.telegram.deleteMessage(userChatId, lastMessageId);
            } catch (error) {
              logger.warn('Error deleting previous message:', error);
            }
          }

          // Send error notification
          const errorMsg = await bot.telegram.sendMessage(
            userChatId,
            `❌ Scheduled trade failed: ${error.message}\n\n` +
            'Actions:\n' +
            '/refresh_balance - Check current balances\n' +
            '/sell_all - Sell all tokens\n' +
            '/stop_trading - Stop auto trading'
          );
          
          this.lastMessageIds.set(userId, errorMsg.message_id);
        }
      });

      this.jobs.set(userId, job);
      return result;
    } catch (error) {
      this.chatIds.delete(userId);
      this.trades.delete(userId);
      logger.error(`Error starting auto trading for user ${userId}:`, error);
      throw error;
    }
  }

  async stopTrading(userId) {
    try {
      const job = this.jobs.get(userId);
      if (job) {
        job.cancel();
        this.jobs.delete(userId);
        this.trades.delete(userId);
        this.chatIds.delete(userId);
        this.lastMessageIds.delete(userId);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error stopping auto trading for user ${userId}:`, error);
      throw error;
    }
  }

  isAutoTrading(userId) {
    return this.jobs.has(userId);
  }

  getTradeInfo(userId) {
    return this.trades.get(userId);
  }
}

export default new AutoTradingService();