import logger from '../../utils/logger.js';
import messageCleanup from '../telegram/messageCleanup.js';

export async function handleTradingError(error, ctx) {
  try {
    let errorMessage = '❌ Trading Error: ';

    if (error.message.includes('Transaction was not confirmed')) {
      const signature = error.message.match(/signature ([a-zA-Z0-9]+)/)?.[1];
      errorMessage += `Transaction pending confirmation.\n` +
        (signature ? 
          `Check status: https://solscan.io/tx/${signature}` :
          'Please check your wallet for transaction status.');
    } else if (error.message.includes('insufficient balance')) {
      errorMessage += 'Insufficient balance for trade. Please check your wallet balance.';
    } else if (error.message.includes('slippage tolerance exceeded')) {
      errorMessage += 'Price impact too high. Try increasing slippage or reducing trade amount.';
    } else {
      errorMessage += error.message;
    }

    // Send temporary error message
    const message = await messageCleanup.sendTemporaryMessage(
      ctx.chat.id,
      errorMessage,
      { parse_mode: 'HTML' }
    );

    logger.error('Trading error handled:', {
      error: error.message,
      userId: ctx.from.id,
      messageId: message.message_id
    });

    return message;
  } catch (error) {
    logger.error('Error handling trading error:', error);
    throw error;
  }
}