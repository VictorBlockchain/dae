import logger from '../../utils/logger.js';
import { getBotInstance } from '../../utils/botInstance.js';

class MessageCleanupService {
  constructor() {
    this.pendingMessages = new Map();
    this.ERROR_MESSAGE_TIMEOUT = 30000; // 30 seconds
    this.STATUS_MESSAGE_TIMEOUT = 60000; // 60 seconds
  }

  async scheduleMessageDeletion(chatId, messageId, timeout = this.ERROR_MESSAGE_TIMEOUT) {
    try {
      // Store the timeout ID so we can cancel it if needed
      const timeoutId = setTimeout(async () => {
        try {
          const bot = getBotInstance();
          await bot.telegram.deleteMessage(chatId, messageId);
          this.pendingMessages.delete(`${chatId}-${messageId}`);
        } catch (error) {
          // Ignore errors if message was already deleted
          if (!error.message.includes('message to delete not found')) {
            logger.error('Error deleting message:', error);
          }
        }
      }, timeout);

      this.pendingMessages.set(`${chatId}-${messageId}`, timeoutId);
    } catch (error) {
      logger.error('Error scheduling message deletion:', error);
    }
  }

  async cancelDeletion(chatId, messageId) {
    const key = `${chatId}-${messageId}`;
    const timeoutId = this.pendingMessages.get(key);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pendingMessages.delete(key);
    }
  }

  async deleteMessage(chatId, messageId) {
    try {
      const bot = getBotInstance();
      await bot.telegram.deleteMessage(chatId, messageId);
      this.cancelDeletion(chatId, messageId);
    } catch (error) {
      // Ignore errors if message was already deleted
      if (!error.message.includes('message to delete not found')) {
        logger.error('Error deleting message:', error);
      }
    }
  }

  async sendTemporaryMessage(chatId, text, options = {}, timeout = this.ERROR_MESSAGE_TIMEOUT) {
    try {
      const bot = getBotInstance();
      const message = await bot.telegram.sendMessage(chatId, text, options);
      await this.scheduleMessageDeletion(chatId, message.message_id, timeout);
      return message;
    } catch (error) {
      logger.error('Error sending temporary message:', error);
      throw error;
    }
  }

  async updateTemporaryMessage(chatId, messageId, text, options = {}, timeout = this.ERROR_MESSAGE_TIMEOUT) {
    try {
      const bot = getBotInstance();
      await bot.telegram.editMessageText(chatId, messageId, null, text, options);
      await this.scheduleMessageDeletion(chatId, messageId, timeout);
    } catch (error) {
      logger.error('Error updating temporary message:', error);
      throw error;
    }
  }
}

export default new MessageCleanupService();