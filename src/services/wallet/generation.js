import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import logger from '../../utils/logger.js';
import { getSOLBalance } from './balance.js';

export async function generateWallet() {
  try {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const secretKey = bs58.encode(keypair.secretKey);
    
    // Verify we can get the balance (tests RPC connection)
    await getSOLBalance(keypair.publicKey);
    
    logger.info('New wallet generated successfully');
    
    return {
      publicKey,
      secretKey,
      keypair
    };
  } catch (error) {
    logger.error('Error generating wallet:', error);
    throw new Error('Failed to generate wallet');
  }
}

export async function importWallet(secretKey) {
  try {
    // Clean up the input
    const cleanKey = secretKey.trim();
    
    // Basic format validation
    if (!cleanKey.match(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/)) {
      throw new Error('Invalid private key format');
    }

    // Try to decode the key
    let decodedKey;
    try {
      decodedKey = bs58.decode(cleanKey);
    } catch (error) {
      throw new Error('Invalid private key encoding');
    }

    // Verify key length
    if (decodedKey.length !== 64) {
      throw new Error('Invalid private key length');
    }

    // Create keypair
    const keypair = Keypair.fromSecretKey(decodedKey);
    const publicKey = keypair.publicKey.toString();

    // Verify we can get the balance (tests RPC connection)
    await getSOLBalance(keypair.publicKey);
    
    logger.info('Wallet imported successfully');
    
    return {
      publicKey,
      secretKey: cleanKey,
      keypair
    };
  } catch (error) {
    logger.error('Error importing wallet:', error);
    throw new Error(`Invalid private key: ${error.message}`);
  }
}