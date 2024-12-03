import { PublicKey } from '@solana/web3.js';
import logger from './logger.js';

export function parsePublicKey(input) {
  try {
    if (!input) {
      throw new Error('Public key input is required');
    }

    // Already a PublicKey instance
    if (input instanceof PublicKey) {
      return input;
    }

    // String format
    if (typeof input === 'string') {
      return new PublicKey(input.trim());
    }

    // Object with publicKey property that is a PublicKey instance
    if (input.publicKey instanceof PublicKey) {
      return input.publicKey;
    }

    // Object with keypair that has a publicKey property
    if (input.keypair?.publicKey instanceof PublicKey) {
      return input.keypair.publicKey;
    }

    // Object with publicKey as string
    if (typeof input.publicKey === 'string') {
      return new PublicKey(input.publicKey.trim());
    }

    // Keypair object with publicKey
    if (input.keypair && typeof input.keypair.publicKey === 'string') {
      return new PublicKey(input.keypair.publicKey.trim());
    }

    throw new Error('Invalid public key format');
  } catch (error) {
    logger.error('Error parsing public key:', error);
    throw new Error(`Invalid public key: ${error.message}`);
  }
}

export function isValidPublicKey(input) {
  try {
    parsePublicKey(input);
    return true;
  } catch (error) {
    return false;
  }
}