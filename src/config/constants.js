export { COMMANDS } from './commands.js';

export const MESSAGES = {
  WELCOME: `🚀 Welcome to Solana Trading Bot!\n\n` +
    `🔒 Getting Started:\n` +
    `1. Create a new wallet address in phantom, specifically for this bot\n` +
    `2. Use /import_wallet to import the private key for that wallet address into the bot. The bot will use funds in that address to trade\n` +
    `3. Never share your private key with anyone else\n` +
    `4. We do not store your private key, you may need to re-import your wallet address from time to time.\n\n` +
    `Trading Commands:\n` +
    `/auto_buy_raydium - Auto trading on Raydium\n` +
    `/auto_buy_pumpfun - Auto trading on Pump.fun\n` +
    `/manual_buy_raydium - Manual trading on Raydium\n` +
    `/manual_buy_pumpfun - Manual trading on Pump.fun\n\n` +
    `Wallet Commands:\n` +
    `/import_wallet - Import your wallet\n` +
    `/wallet_info - View wallet information\n` +
    `/export_key - Reveal private key securely\n` +
    `/remove_wallet - Remove current wallet\n\n` +
    `Other Commands:\n` +
    `/refresh_balance - Update balances\n` +
    `/sell_all - Sell all tokens\n` +
    `/stop_trading - Stop auto trading\n` +
    `/trade_status - Check trading status\n` +
    `/set_slippage - Set Raydium trade slippage`,

  ERROR: {
    GENERAL: 'An error occurred. Please try again.',
    WALLET: 'Error with wallet operation. Please try again.',
    TRADING: 'Error with trading operation. Please try again.',
    ADMIN: 'This command is only available to administrators.'
  }
};

export const JUPITER_CONFIG = {
  API_URL: 'https://public.jupiterapi.com',
  DEFAULT_SLIPPAGE: 0.5, // 0.5%
  MIN_SLIPPAGE: 0.1,
  MAX_SLIPPAGE: 10.0,
  COMPUTE_PRICE: 1 // Prioritize transactions
};