import { PublicKey } from '@solana/web3.js';
import logger from '../../utils/logger.js';
import { getConnection } from '../../config/solana.js';
import { executeTransaction } from './transactions.js';
import { getSOLBalance } from '../wallet/balance.js';
import priceService from './price.js';

class CopyTradingService {
  constructor() {
    this.watchers = new Map();
    this.settings = new Map();
  }

  async startCopying(userId, sourceAddress, userWallet, maxAmount) {
    if (this.watchers.has(userId)) {
      await this.stopCopying(userId);
    }

    try {
      const connection = await getConnection();
      const sourcePubKey = new PublicKey(sourceAddress);

      // Store settings
      this.settings.set(userId, {
        sourceAddress,
        maxAmount,
        lastTransaction: null
      });

      // Subscribe to account changes
      const subscription = connection.onAccountChange(
        sourcePubKey,
        async (accountInfo) => {
          try {
            await this.handleAccountChange(accountInfo, userId, userWallet);
          } catch (error) {
            logger.error(`Copy trading error for user ${userId}:`, error);
          }
        },
        'confirmed'
      );

      this.watchers.set(userId, subscription);
      logger.info(`Copy trading started for user ${userId}`);
      return true;
    } catch (error) {
      logger.error(`Error starting copy trading for user ${userId}:`, error);
      return false;
    }
  }

  async stopCopying(userId) {
    try {
      const subscription = this.watchers.get(userId);
      if (subscription) {
        const connection = await getConnection();
        connection.removeAccountChangeListener(subscription);
        this.watchers.delete(userId);
        this.settings.delete(userId);
        logger.info(`Copy trading stopped for user ${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error stopping copy trading for user ${userId}:`, error);
      return false;
    }
  }

  async handleAccountChange(accountInfo, userId, userWallet) {
    try {
      const settings = this.settings.get(userId);
      if (!settings) return;

      // Get user's balance
      const balance = await getSOLBalance(userWallet.publicKey);
      if (balance < settings.maxAmount) {
        logger.warn(`Insufficient balance for copy trading user ${userId}`);
        return;
      }

      // Get transaction details
      const connection = await getConnection();
      const signatures = await connection.getSignaturesForAddress(
        new PublicKey(settings.sourceAddress),
        { limit: 1 }
      );

      if (!signatures[0] || signatures[0].signature === settings.lastTransaction) {
        return;
      }

      // Get transaction details
      const transaction = await connection.getTransaction(signatures[0].signature);
      if (!transaction?.meta?.postTokenBalances?.length) {
        return;
      }

      // Extract token information
      const tokenInfo = transaction.meta.postTokenBalances[0];
      if (!tokenInfo?.mint) {
        return;
      }

      // Execute copy trade
      const result = await executeTransaction(
        userWallet,
        Math.min(settings.maxAmount, balance),
        'buy',
        tokenInfo.mint
      );

      // Update last transaction
      settings.lastTransaction = signatures[0].signature;
      this.settings.set(userId, settings);

      logger.info(`Copy trade executed for user ${userId}:`, result.tradeInfo);
    } catch (error) {
      logger.error(`Error handling account change for user ${userId}:`, error);
    }
  }

  isActiveCopying(userId) {
    return this.watchers.has(userId);
  }
}

export default new CopyTradingService();