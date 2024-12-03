import { Connection, Keypair } from '@solana/web3.js';
import logger from '../utils/logger.js';

const CONNECTION_CONFIG = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 120000
};

let connection = null;
let lastBlockhash = null;
let lastBlockhashTime = 0;
const BLOCKHASH_CACHE_DURATION = 5000; // 5 seconds

export async function getConnection(forceNew = false) {
  if (connection && !forceNew) {
    try {
      await connection.getSlot();
      return connection;
    } catch (error) {
      logger.warn('Existing connection failed, creating new connection');
      connection = null;
    }
  }

  try {
    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) {
      throw new Error('SOLANA_RPC_URL not configured');
    }

    connection = new Connection(rpcUrl, CONNECTION_CONFIG);
    await connection.getSlot(); // Test connection
    logger.info('Connected to Solana network');
    return connection;
  } catch (error) {
    logger.error('Failed to establish connection:', error);
    throw new Error('Unable to connect to Solana network');
  }
}

export async function getBlockhash(forceFresh = false) {
  try {
    const now = Date.now();
    
    if (!forceFresh && 
        lastBlockhash && 
        now - lastBlockhashTime < BLOCKHASH_CACHE_DURATION) {
      return lastBlockhash;
    }

    const conn = await getConnection();
    const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash('finalized');

    lastBlockhash = { blockhash, lastValidBlockHeight };
    lastBlockhashTime = now;

    return lastBlockhash;
  } catch (error) {
    logger.error('Error getting blockhash:', error);
    throw error;
  }
}

export async function confirmTransaction(signature, blockhash, lastValidBlockHeight) {
  try {
    const conn = await getConnection();
    const result = await conn.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });

    return result;
  } catch (error) {
    logger.error('Error confirming transaction:', error);
    throw error;
  }
}

export async function initializeConnection() {
  try {
    const conn = await getConnection(true);
    await conn.getSlot(); // Verify connection
    logger.info('Solana connection initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize Solana connection:', error);
    return false;
  }
}