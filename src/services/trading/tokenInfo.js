import axios from 'axios';
import logger from '../../utils/logger.js';

const DEXSCREENER_API_URL = 'https://api.dexscreener.com/latest/dex';
const TOKEN_CACHE = new Map();
const CACHE_DURATION = 30000; // 30 seconds

class TokenInfoService {
  async getTokenInfo(address) {
    try {
      // Check cache first
      const cached = TOKEN_CACHE.get(address);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.info;
      }

      // Fetch from DexScreener
      const response = await axios.get(`${DEXSCREENER_API_URL}/tokens/${address}`);
      
      if (response.data?.pairs?.[0]) {
        const pair = response.data.pairs[0];
        const info = {
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          decimals: pair.baseToken.decimals || 9,
          priceUsd: pair.priceUsd,
          liquidity: pair.liquidity?.usd,
          volume24h: pair.volume?.h24,
          priceChange24h: pair.priceChange?.h24
        };

        // Cache the result
        TOKEN_CACHE.set(address, {
          info,
          timestamp: Date.now()
        });

        logger.info(`Token info fetched for ${address}:`, info);
        return info;
      }

      // Return basic info if not found
      const basicInfo = {
        symbol: address.slice(0, 6) + '...',
        name: 'Unknown Token',
        decimals: 9
      };

      TOKEN_CACHE.set(address, {
        info: basicInfo,
        timestamp: Date.now()
      });

      return basicInfo;
    } catch (error) {
      logger.error('Error fetching token info:', error);
      return {
        symbol: address.slice(0, 6) + '...',
        name: 'Unknown Token',
        decimals: 9
      };
    }
  }

  formatAmount(amount, decimals = 9) {
    try {
      if (!amount) return '0';
      const value = BigInt(amount) / BigInt(10 ** decimals);
      return value.toString();
    } catch (error) {
      logger.error('Error formatting amount:', error);
      return '0';
    }
  }

  async getPriceInfo(address) {
    try {
      const response = await axios.get(`${DEXSCREENER_API_URL}/tokens/${address}`);
      
      if (response.data?.pairs?.[0]) {
        const pair = response.data.pairs[0];
        return {
          priceUsd: pair.priceUsd,
          priceChange24h: pair.priceChange?.h24 || 0,
          liquidity: pair.liquidity?.usd || 0,
          volume24h: pair.volume?.h24 || 0
        };
      }

      return null;
    } catch (error) {
      logger.error('Error fetching price info:', error);
      return null;
    }
  }
}

export default new TokenInfoService();