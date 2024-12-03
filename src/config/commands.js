export const COMMANDS = {
  // Basic Commands
  START: 'start',
  IMPORT_WALLET: 'import_wallet',
  WALLET_INFO: 'wallet_info',
  EXPORT_KEY: 'export_key',
  REMOVE_WALLET: 'remove_wallet',

  // Trading - Raydium
  AUTO_BUY_RAYDIUM: 'auto_buy_raydium',
  MANUAL_BUY_RAYDIUM: 'manual_buy_raydium',

  // Trading - Pump.fun
  AUTO_BUY_PUMPFUN: 'auto_buy_pumpfun',
  MANUAL_BUY_PUMPFUN: 'manual_buy_pumpfun',

  // Other Trading Commands
  SET_SLIPPAGE: 'set_slippage',
  REFRESH_BALANCE: 'refresh_balance',
  SELL_ALL: 'sell_all',
  STOP_TRADING: 'stop_trading',
  TRADE_STATUS: 'trade_status',

  // Admin Commands
  ADMIN: 'admin',
  SET_FEE: 'set_fee',
  SET_FOCUS_TOKEN: 'set_focus_token',
  TOGGLE_FOCUS: 'toggle_focus'
};

export const COMMAND_DESCRIPTIONS = {
  [COMMANDS.START]: '🚀 Start the bot and see available commands',
  [COMMANDS.IMPORT_WALLET]: '🔑 Import your wallet using private key',
  [COMMANDS.WALLET_INFO]: '💰 View your current wallet information',
  [COMMANDS.EXPORT_KEY]: '🔐 Securely reveal your private key',
  [COMMANDS.REMOVE_WALLET]: '❌ Remove your current wallet',
  [COMMANDS.AUTO_BUY_RAYDIUM]: '🤖 Setup auto trading on Raydium',
  [COMMANDS.MANUAL_BUY_RAYDIUM]: '📈 Manual trading on Raydium',
  [COMMANDS.AUTO_BUY_PUMPFUN]: '🎯 Setup auto trading on Pump.fun',
  [COMMANDS.MANUAL_BUY_PUMPFUN]: '🎮 Manual trading on Pump.fun',
  [COMMANDS.SET_SLIPPAGE]: '⚙️ Set your trading slippage tolerance',
  [COMMANDS.REFRESH_BALANCE]: '🔄 Update your wallet balance',
  [COMMANDS.SELL_ALL]: '💱 Sell all tokens for SOL',
  [COMMANDS.STOP_TRADING]: '⏹️ Stop auto trading',
  [COMMANDS.TRADE_STATUS]: '📊 Check current trading status'
};