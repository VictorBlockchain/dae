import logger from '../../utils/logger.js';
import { PublicKey } from '@solana/web3.js';

class AdminService {
  constructor() {
    this.serviceFee = 0.0015; // Default fee in SOL
    this.focusToken = null;
    this.focusModeEnabled = false;
  }

  setServiceFee(fee) {
    try {
      const parsedFee = parseFloat(fee);
      if (isNaN(parsedFee) || parsedFee < 0 || parsedFee > 1) {
        throw new Error('Invalid fee amount. Must be between 0 and 1 SOL');
      }
      this.serviceFee = parsedFee;
      logger.info(`Service fee set to ${parsedFee} SOL`);
      return this.serviceFee;
    } catch (error) {
      logger.error('Error setting service fee:', error);
      throw error;
    }
  }

  setFocusToken(tokenAddress) {
    try {
      // Validate token address format
      if (!tokenAddress || typeof tokenAddress !== 'string') {
        throw new Error('Token address is required');
      }

      // Clean the address string
      const cleanAddress = tokenAddress.trim();
      
      try {
        // Validate Solana address format
        new PublicKey(cleanAddress);
        this.focusToken = cleanAddress;
        logger.info(`Focus token set to ${cleanAddress}`);
        return this.focusToken;
      } catch (err) {
        throw new Error('Invalid Solana address format');
      }
    } catch (error) {
      logger.error('Invalid token address:', error);
      throw error;
    }
  }

  toggleFocusMode() {
    try {
      if (!this.focusToken) {
        throw new Error('Cannot enable focus mode: No focus token set');
      }
      this.focusModeEnabled = !this.focusModeEnabled;
      logger.info(`Focus mode ${this.focusModeEnabled ? 'enabled' : 'disabled'}`);
      return this.focusModeEnabled;
    } catch (error) {
      logger.error('Error toggling focus mode:', error);
      throw error;
    }
  }

  getFocusToken() {
    return this.focusToken;
  }

  isFocusModeEnabled() {
    return this.focusModeEnabled;
  }

  getServiceFee() {
    return this.serviceFee;
  }
}

export default new AdminService();