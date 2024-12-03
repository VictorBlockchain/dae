import { generateWallet, importWallet } from './generation.js';
import logger from '../../utils/logger.js';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

class WalletStorageService {
  constructor() {
    this.wallets = new Map();
    this.storageFile = '.data/wallets.json';
  }

  async init() {
    try {
      // Create storage directory if it doesn't exist
      await mkdir(dirname(this.storageFile), { recursive: true });
      
      // Try to load existing wallets
      try {
        const data = await readFile(this.storageFile, 'utf8');
        const walletData = JSON.parse(data);
        Object.entries(walletData).forEach(([userId, wallet]) => {
          this.wallets.set(userId, wallet);
        });
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist yet, that's fine
        await this.saveWallets();
      }

      logger.info('Wallet storage initialized');
    } catch (error) {
      logger.error('Error initializing wallet storage:', error);
      throw new Error('Failed to initialize wallet storage');
    }
  }

  async saveWallets() {
    try {
      const walletData = {};
      this.wallets.forEach((wallet, userId) => {
        walletData[userId] = wallet;
      });
      await writeFile(this.storageFile, JSON.stringify(walletData, null, 2));
    } catch (error) {
      logger.error('Error saving wallets:', error);
      throw new Error('Failed to save wallets to storage');
    }
  }

  async getWallet(userId) {
    try {
      const userKey = userId.toString();
      const walletData = this.wallets.get(userKey);
      
      if (!walletData) {
        return null;
      }

      return await importWallet(walletData.secretKey);
    } catch (error) {
      logger.error('Error getting wallet:', error);
      throw new Error('Failed to retrieve wallet');
    }
  }

  async setWallet(userId, wallet) {
    try {
      if (!userId || !wallet?.publicKey || !wallet?.secretKey) {
        throw new Error('Invalid wallet data');
      }

      const userKey = userId.toString();
      const walletData = {
        publicKey: wallet.publicKey.toString(),
        secretKey: wallet.secretKey.toString()
      };

      this.wallets.set(userKey, walletData);
      await this.saveWallets();
      logger.info(`Wallet saved for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Error saving wallet:', error);
      throw new Error('Failed to save wallet');
    }
  }

  async removeWallet(userId) {
    try {
      const userKey = userId.toString();
      const deleted = this.wallets.delete(userKey);
      if (deleted) {
        await this.saveWallets();
      }
      logger.info(`Wallet ${deleted ? 'removed' : 'not found'} for user ${userId}`);
      return deleted;
    } catch (error) {
      logger.error('Error removing wallet:', error);
      throw new Error('Failed to remove wallet');
    }
  }

  async hasWallet(userId) {
    try {
      const userKey = userId.toString();
      return this.wallets.has(userKey);
    } catch (error) {
      logger.error('Error checking wallet existence:', error);
      return false;
    }
  }
}

export default new WalletStorageService();