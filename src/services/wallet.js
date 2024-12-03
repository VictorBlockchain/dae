const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const logger = require('../utils/logger');

// Initialize Solana connection with proper URL
const connection = new Connection(process.env.SOLANA_NETWORK || 'https://api.devnet.solana.com');

async function generateWallet() {
  const wallet = Keypair.generate();
  return wallet;
}

async function getWalletBalance(publicKey) {
  try {
    const balance = await connection.getBalance(new PublicKey(publicKey));
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    logger.error('Error getting wallet balance:', error);
    throw error;
  }
}

module.exports = {
  generateWallet,
  getWalletBalance
};