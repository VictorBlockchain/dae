import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection } from '../../config/solana.js';
import logger from '../../utils/logger.js';

const balanceCache = new Map();
const CACHE_DURATION = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

async function fetchBalanceWithRetry(publicKey, attempt = 1) {
  try {
    const connection = await getConnection();
    const balance = await connection.getBalance(publicKey, 'confirmed');
    return balance;
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      logger.warn(`Retry ${attempt} failed, attempting again in ${RETRY_DELAY}ms`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchBalanceWithRetry(publicKey, attempt + 1);
    }
    throw error;
  }
}

export async function getSOLBalance(publicKeyInput) {
  try {
    if (!publicKeyInput) {
      throw new Error('Public key is required');
    }

    // Parse public key
    let publicKey;
    try {
      if (publicKeyInput instanceof PublicKey) {
        publicKey = publicKeyInput;
      } else if (typeof publicKeyInput === 'string') {
        publicKey = new PublicKey(publicKeyInput);
      } else if (publicKeyInput?.publicKey instanceof PublicKey) {
        publicKey = publicKeyInput.publicKey;
      } else if (typeof publicKeyInput?.publicKey === 'string') {
        publicKey = new PublicKey(publicKeyInput.publicKey);
      } else {
        throw new Error('Invalid public key format');
      }
    } catch (error) {
      throw new Error(`Invalid public key: ${error.message}`);
    }

    const pubKeyStr = publicKey.toString();

    // Check cache
    const cached = balanceCache.get(pubKeyStr);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.balance;
    }

    // Get balance with retry
    const lamports = await fetchBalanceWithRetry(publicKey);
    const balance = lamports / LAMPORTS_PER_SOL;

    // Cache result
    balanceCache.set(pubKeyStr, {
      balance,
      timestamp: Date.now()
    });

    logger.debug(`Balance fetched for ${pubKeyStr}: ${balance} SOL`);
    return balance;

  } catch (error) {
    logger.error('Error getting SOL balance:', error);
    throw new Error(`Failed to get wallet balance: ${error.message}`);
  }
}