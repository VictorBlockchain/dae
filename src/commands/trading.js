import { Telegraf } from 'telegraf';
import { MESSAGES } from '../config/constants.js';
import jupiterService from '../services/trading/jupiter.js';
import pumpfunService from '../services/trading/pumpfun.js';
import autoTradingService from '../services/trading/autoTrading.js';
import tokenInfoService from '../services/trading/tokenInfo.js';
import { getTokenBalance } from '../services/wallet/tokenBalance.js';
import logger from '../utils/logger.js';
import { getSOLBalance } from '../services/wallet/balance.js';
import adminService from '../services/admin/index.js';
import { getBotInstance } from '../utils/botInstance.js';

export function setupTradingCommands(bot) {
  // Auto buy Raydium command
  bot.command('auto_buy_raydium', async (ctx) => {
    try {
      if (!ctx.session?.wallet) {
        return ctx.reply('Please generate a wallet first using /generate_wallet');
      }

      const loadingMsg = await ctx.reply('🔄 Checking wallet balance...');

      const balance = await getSOLBalance(ctx.session.wallet.publicKey);
      const serviceFee = adminService.getServiceFee();
      const minRequired = 0.001 + serviceFee + 0.000005;

      if (balance < minRequired) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          `❌ Insufficient balance. Minimum ${minRequired} SOL required (including service fee and network fee).`
        );
        return;
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        'Auto Trading Setup (Raydium)\n\n' +
        `Available balance: ${balance.toFixed(6)} SOL\n\n` +
        'Enter token address, amount, and interval:\n' +
        'Format: TOKEN_ADDRESS AMOUNT MINUTES\n' +
        'Example: "FpkoJzLxj51... 0.1 5" for 0.1 SOL every 5 minutes\n\n' +
        `Current slippage: ${jupiterService.getUserSlippage(ctx.from.id)}%\n` +
        'Use /set_slippage to adjust your slippage tolerance'
      );
      
      ctx.session.awaitingInput = 'auto_buy_raydium';
    } catch (error) {
      logger.error('Auto trade setup error:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });

  // Auto buy Pump.fun command
  bot.command('auto_buy_pumpfun', async (ctx) => {
    try {
      if (!ctx.session?.wallet) {
        return ctx.reply('Please generate a wallet first using /generate_wallet');
      }

      const loadingMsg = await ctx.reply('🔄 Checking wallet balance...');

      const balance = await getSOLBalance(ctx.session.wallet.publicKey);
      const serviceFee = adminService.getServiceFee();
      const minRequired = 0.001 + serviceFee + 0.000005;

      if (balance < minRequired) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          `❌ Insufficient balance. Minimum ${minRequired} SOL required (including service fee and network fee).`
        );
        return;
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        'Auto Trading Setup (Pump.fun)\n\n' +
        `Available balance: ${balance.toFixed(6)} SOL\n\n` +
        'Enter token address, amount, and interval:\n' +
        'Format: TOKEN_ADDRESS AMOUNT MINUTES\n' +
        'Example: "FpkoJzLxj51... 0.1 5" for 0.1 SOL every 5 minutes\n\n' +
        'Note: Fixed 10% slippage for Pump.fun trades'
      );
      
      ctx.session.awaitingInput = 'auto_buy_pumpfun';
    } catch (error) {
      logger.error('Auto trade setup error:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });

  // Handle trading inputs
  bot.on('text', async (ctx, next) => {
    if (!ctx.session?.awaitingInput) {
      return next();
    }

    try {
      switch (ctx.session.awaitingInput) {
        case 'set_slippage': {
          const slippage = parseFloat(ctx.message.text);
          const newSlippage = jupiterService.setUserSlippage(ctx.from.id, slippage);
          await ctx.reply(`✅ Slippage set to ${newSlippage}%`);
          break;
        }

        case 'auto_buy_raydium':
        case 'auto_buy_pumpfun': {
          const loadingMsg = await ctx.reply('🔄 Setting up auto trading...');
          
          const [tokenAddress, amountStr, intervalStr] = ctx.message.text.split(' ');
          const amount = parseFloat(amountStr);
          const interval = parseInt(intervalStr);
          
          if (!tokenAddress || isNaN(amount) || isNaN(interval) || amount <= 0 || interval <= 0) {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              loadingMsg.message_id,
              null,
              '❌ Please enter valid token address, amount, and interval values'
            );
            return;
          }

          await ctx.telegram.editMessageText(
            ctx.chat.id,
            loadingMsg.message_id,
            null,
            '🔄 Getting token information...'
          );

          const tokenInfo = await tokenInfoService.getTokenInfo(tokenAddress);
          const exchange = ctx.session.awaitingInput === 'auto_buy_raydium' ? 'raydium' : 'pumpfun';

          await ctx.telegram.editMessageText(
            ctx.chat.id,
            loadingMsg.message_id,
            null,
            '🔄 Executing initial trade...'
          );

          const result = await autoTradingService.startTrading(
            ctx.from.id,
            ctx.session.wallet,
            amount,
            interval,
            tokenAddress,
            ctx.chat.id,
            exchange
          );

          // Get token balance after trade
          const tokenBalance = await getTokenBalance(ctx.session.wallet.publicKey, tokenAddress);
          const formattedBalance = tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals);

          await ctx.telegram.editMessageText(
            ctx.chat.id,
            loadingMsg.message_id,
            null,
            '✅ Auto trading started successfully!\n\n' +
            `Exchange: ${exchange === 'raydium' ? 'Raydium' : 'Pump.fun'}\n` +
            `Token: ${tokenInfo.symbol} (${tokenInfo.name})\n` +
            `Address: ${tokenAddress}\n` +
            `Current Balance: ${formattedBalance} ${tokenInfo.symbol}\n\n` +
            `Amount per trade: ${amount} SOL\n` +
            `Interval: ${interval} minutes\n` +
            `Slippage: ${exchange === 'raydium' ? jupiterService.getUserSlippage(ctx.from.id) : 10}%\n\n` +
            `Initial trade executed:\n` +
            `Transaction: ${result.signature}\n` +
            (result.outputAmount ? 
              `Amount Out: ${tokenInfoService.formatAmount(result.outputAmount, tokenInfo.decimals)} ${tokenInfo.symbol}\n` +
              `Price Impact: ${result.priceImpact}%\n\n` : '\n') +
            'Commands:\n' +
            '/refresh_balance - Update token balance\n' +
            '/sell_all - Sell all tokens for SOL\n' +
            '/stop_trading - Stop auto trading\n' +
            '/trade_status - Check current status'
          );
          break;
        }
      }
    } catch (error) {
      logger.error('Error handling trading input:', error);
      await ctx.reply(`❌ ${error.message}`);
    } finally {
      ctx.session.awaitingInput = null;
    }
  });

  // Refresh balance command
  bot.command('refresh_balance', async (ctx) => {
    try {
      if (!autoTradingService.isAutoTrading(ctx.from.id)) {
        return ctx.reply('No active auto trading session found');
      }

      const loadingMsg = await ctx.reply('🔄 Refreshing balances...');
      
      const tradeInfo = autoTradingService.getTradeInfo(ctx.from.id);
      const tokenInfo = await tokenInfoService.getTokenInfo(tradeInfo.tokenAddress);
      
      const [solBalance, tokenBalance] = await Promise.all([
        getSOLBalance(ctx.session.wallet.publicKey),
        getTokenBalance(ctx.session.wallet.publicKey, tradeInfo.tokenAddress)
      ]);

      const formattedTokenBalance = tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        '💰 Current Balances\n\n' +
        `SOL: ${solBalance.toFixed(6)}\n` +
        `${tokenInfo.symbol}: ${formattedTokenBalance}\n\n` +
        'Use /sell_all to sell all tokens for SOL'
      );
    } catch (error) {
      logger.error('Error refreshing balances:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });

  // Sell all command
  bot.command('sell_all', async (ctx) => {
    try {
      if (!ctx.session?.wallet) {
        return ctx.reply('Please generate a wallet first using /generate_wallet');
      }

      const loadingMsg = await ctx.reply('🔄 Preparing to sell all tokens...');
      
      const tradeInfo = autoTradingService.getTradeInfo(ctx.from.id);
      if (!tradeInfo) {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          '❌ No active trading session found'
        );
        return;
      }

      const tokenInfo = await tokenInfoService.getTokenInfo(tradeInfo.tokenAddress);
      const tokenBalance = await getTokenBalance(ctx.session.wallet.publicKey, tradeInfo.tokenAddress);

      if (!tokenBalance.amount || tokenBalance.amount === '0') {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          loadingMsg.message_id,
          null,
          '❌ No tokens available to sell'
        );
        return;
      }

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        '🔄 Stopping auto trading and selling tokens...'
      );

      // Stop auto trading first
      await autoTradingService.stopTrading(ctx.from.id);

      // Execute sell based on exchange
      let result;
      if (tradeInfo.exchange === 'raydium') {
        result = await jupiterService.executeSwap(
          ctx.session.wallet,
          tradeInfo.tokenAddress,
          'So11111111111111111111111111111111111111112',
          tokenBalance.amount,
          ctx.from.id,
          true // Use higher slippage for urgent sells
        );
      } else {
        result = await pumpfunService.executeSwap(
          ctx.session.wallet,
          tradeInfo.tokenAddress,
          tokenBalance.amount,
          'sell',
          ctx.from.id,
          false
        );
      }

      const newSolBalance = await getSOLBalance(ctx.session.wallet.publicKey);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        '✅ Tokens sold successfully!\n\n' +
        `Token: ${tokenInfo.symbol} (${tokenInfo.name})\n` +
        `Amount Sold: ${tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals)} ${tokenInfo.symbol}\n` +
        `Transaction: ${result.signature}\n` +
        (result.outputAmount ? 
          `SOL Received: ${(result.outputAmount / 1e9).toFixed(6)} SOL\n` : '') +
        `New SOL Balance: ${newSolBalance.toFixed(6)} SOL\n\n` +
        '✅ Auto trading has been stopped'
      );
    } catch (error) {
      logger.error('Error selling tokens:', error);
      await ctx.reply(`❌ Error selling tokens: ${error.message}`);
    }
  });

  // Set slippage command
  bot.command('set_slippage', async (ctx) => {
    try {
      if (!ctx.session?.wallet) {
        return ctx.reply('Please generate or import a wallet first using /generate_wallet or /import_wallet');
      }

      await ctx.reply(
        'Enter your desired slippage percentage (0.1% to 10%):\n\n' +
        'Example: 0.5 for 0.5% slippage\n\n' +
        'Note: This only affects Raydium trades. Pump.fun trades use fixed 10% slippage.'
      );
      
      ctx.session.awaitingInput = 'set_slippage';
    } catch (error) {
      logger.error('Error initiating slippage setting:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });

  // Stop trading command
  bot.command('stop_trading', async (ctx) => {
    try {
      if (!autoTradingService.isAutoTrading(ctx.from.id)) {
        return ctx.reply('No active auto trading session found');
      }

      await autoTradingService.stopTrading(ctx.from.id);
      await ctx.reply('✅ Auto trading stopped successfully');
    } catch (error) {
      logger.error('Error stopping auto trade:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });

  // Trade status command
  bot.command('trade_status', async (ctx) => {
    try {
      if (!autoTradingService.isAutoTrading(ctx.from.id)) {
        return ctx.reply('No active auto trading session found');
      }

      const loadingMsg = await ctx.reply('🔄 Fetching trade status...');

      const tradeInfo = autoTradingService.getTradeInfo(ctx.from.id);
      const tokenInfo = await tokenInfoService.getTokenInfo(tradeInfo.tokenAddress);
      const tokenBalance = await getTokenBalance(ctx.session.wallet.publicKey, tradeInfo.tokenAddress);
      
      const runtime = Math.floor((Date.now() - tradeInfo.startTime) / 60000); // minutes
      const formattedBalance = tokenInfoService.formatAmount(tokenBalance.amount, tokenInfo.decimals);

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        loadingMsg.message_id,
        null,
        '📊 Auto Trading Status\n\n' +
        `Exchange: ${tradeInfo.exchange === 'raydium' ? 'Raydium' : 'Pump.fun'}\n` +
        `Token: ${tokenInfo.symbol} (${tokenInfo.name})\n` +
        `Address: ${tradeInfo.tokenAddress}\n` +
        `Current Balance: ${formattedBalance} ${tokenInfo.symbol}\n\n` +
        `Amount per trade: ${tradeInfo.amount} SOL\n` +
        `Interval: ${tradeInfo.interval} minutes\n` +
        `Running time: ${runtime} minutes\n` +
        `Slippage: ${tradeInfo.exchange === 'raydium' ? jupiterService.getUserSlippage(ctx.from.id) : 10}%\n\n` +
        'Commands:\n' +
        '/refresh_balance - Update balances\n' +
        '/sell_all - Sell all tokens\n' +
        '/stop_trading - Stop auto trading'
      );
    } catch (error) {
      logger.error('Error getting trade status:', error);
      await ctx.reply(MESSAGES.ERROR.TRADING);
    }
  });
}