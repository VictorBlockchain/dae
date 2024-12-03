import { PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { getConnection } from '../../config/solana.js';
import logger from '../../utils/logger.js';
import { parsePublicKey } from '../../utils/publicKey.js';

const JUPITER_TOKEN_LIST_URL = 'https://token.jup.ag/all';
const balanceCache = new Map();
const tokenListCache = {
  tokens: new Map(),
  lastUpdate: 0
};

const CACHE_DURATION = 10000; // 10 seconds
const TOKEN_LIST_UPDATE_INTERVAL = 3600000; // 1 hour
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function getTokenList() {
  try {
    // Check if we need to update token list
    if (
      tokenListCache.lastUpdate === 0 ||
      Date.now() - tokenListCache.lastUpdate > TOKEN_LIST_UPDATE_INTERVAL
    ) {
      const response = await axios.get(JUPITER_TOKEN_LIST_URL);
      if (response.data) {
        tokenListCache.tokens.clear();
        response.data.forEach(token => {
          tokenListCache.tokens.set(token.address, token);
        });
        tokenListCache.lastUpdate = Date.now();
      }
    }
    return tokenListCache.tokens;
  } catch (error) {
    logger.error('Error fetching token list:', error);
    return new Map();
  }
}

async function fetchTokenBalance(connection, walletAddress, tokenAddress, attempt = 1) {
  try {
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { mint: tokenAddress }
    );

    if (!tokenAccounts.value.length) {
      return {
        amount: '0',
        decimals: 0
      };
    }

    const account = tokenAccounts.value[0].account.data.parsed.info;
    return {
      amount: account.tokenAmount.amount,
      decimals: account.tokenAmount.decimals
    };
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      logger.warn(`Token balance fetch attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchTokenBalance(connection, walletAddress, tokenAddress, attempt + 1);
    }
    throw error;
  }
}

export async function getTokenBalance(walletAddress, tokenAddress) {
  try {
    // Parse addresses
    const wallet = parsePublicKey(walletAddress);
    const token = new PublicKey(tokenAddress);

    // Generate cache key
    const cacheKey = `${wallet.toString()}-${token.toString()}`;
    
    // Check cache
    const cached = balanceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.balance;
    }

    // Get connection and token list
    const connection = await getConnection();
    const tokenList = await getTokenList();
    const tokenInfo = tokenList.get(token.toString());

    if (!tokenInfo) {
      logger.warn(`Token ${tokenAddress} not found in Jupiter token list`);
    }

    // Fetch balance
    const balance = await fetchTokenBalance(connection, wallet, token);
    
    // Format response
    const result = {
      amount: balance.amount,
      decimals: balance.decimals || tokenInfo?.decimals || 9,
      tokenAddress: token.toString(),
      symbol: tokenInfo?.symbol || 'UNKNOWN',
      name: tokenInfo?.name || 'Unknown Token'
    };

    // Cache result
    balanceCache.set(cacheKey, {
      balance: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    logger.error('Error getting token balance:', error);
    throw new Error(`Failed to get token balance: ${error.message}`);
  }
}

export function formatTokenBalance(balance) {
  if (!balance?.amount) return '0';
  
  try {
    const amount = BigInt(balance.amount);
    const decimals = balance.decimals || 9;
    const divisor = BigInt(10 ** decimals);
    
    const integerPart = amount / divisor;
    const fractionalPart = amount % divisor;
    
    let formatted = integerPart.toString();
    if (fractionalPart > 0) {
      let fraction = fractionalPart.toString().padStart(decimals, '0');
      // Remove trailing zeros
      fraction = fraction.replace(/0+$/, '');
      if (fraction.length > 0) {
        formatted += '.' + fraction;
      }
    }
    
    return formatted;
  } catch (error) {
    logger.error('Error formatting token balance:', error);
    return '0';
  }
}

// Update token list periodically
setInterval(async () => {
  try {
    await getTokenList();
  } catch (error) {
    logger.error('Error updating token list:', error);
  }
}, TOKEN_LIST_UPDATE_INTERVAL);