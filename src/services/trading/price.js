import axios from 'axios';
import { PublicKey } from '@solana/web3.js';
import logger from '../../utils/logger.js';
import Decimal from 'decimal.js';

class PriceService {
  constructor() {
    this.priceCache = new Map();
    this.tokenInfoCache = new Map();
    this.lastPrices = new Map();
    this.CACHE_DURATION = 30000; // 30 seconds
    this.BIRDEYE_API_KEY = 'c040ec73468a4014bc6a196d35a3c47a';
  }

  async getTokenPrice(tokenAddress) {
    try {
      // Check cache first
      const cachedPrice = this.priceCache.get(tokenAddress);
      if (cachedPrice && Date.now() - cachedPrice.timestamp < this.CACHE_DURATION) {
        return cachedPrice.price;
      }

      // Try DexScreener first
      try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (response.data?.pairs?.[0]) {
          const price = parseFloat(response.data.pairs[0].priceUsd);
          if (!isNaN(price)) {
            this.updatePriceHistory(tokenAddress, price);
            this.priceCache.set(tokenAddress, {
              price,
              timestamp: Date.now()
            });
            return price;
          }
        }
      } catch (error) {
        logger.warn('DexScreener price fetch failed, trying Birdeye:', error);
      }

      // Fallback to Birdeye
      const birdeyeResponse = await axios.get(
        `https://public-api.birdeye.so/public/price?address=${tokenAddress}`,
        {
          headers: {
            'X-API-KEY': this.BIRDEYE_API_KEY
          }
        }
      );

      if (birdeyeResponse.data?.data?.value) {
        const price = parseFloat(birdeyeResponse.data.data.value);
        if (!isNaN(price)) {
          this.updatePriceHistory(tokenAddress, price);
          this.priceCache.set(tokenAddress, {
            price,
            timestamp: Date.now()
          });
          return price;
        }
      }

      throw new Error('Price not available');
    } catch (error) {
      logger.error('Error fetching token price:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenAddress) {
    try {
      // Check cache first
      const cachedInfo = this.tokenInfoCache.get(tokenAddress);
      if (cachedInfo && Date.now() - cachedInfo.timestamp < this.CACHE_DURATION) {
        return cachedInfo.info;
      }

      // Try DexScreener first
      try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (response.data?.pairs?.[0]) {
          const pair = response.data.pairs[0];
          const info = {
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name,
            address: tokenAddress,
            decimals: 9,
            liquidity: pair.liquidity?.usd,
            volume24h: pair.volume?.h24,
            fdv: pair.fdv
          };

          this.tokenInfoCache.set(tokenAddress, {
            info,
            timestamp: Date.now()
          });

          return info;
        }
      } catch (error) {
        logger.warn('DexScreener token info fetch failed, trying Birdeye:', error);
      }

      // Fallback to Birdeye
      const birdeyeResponse = await axios.get(
        `https://public-api.birdeye.so/public/token_metadata?address=${tokenAddress}`,
        {
          headers: {
            'X-API-KEY': this.BIRDEYE_API_KEY
          }
        }
      );

      if (birdeyeResponse.data?.data) {
        const tokenData = birdeyeResponse.data.data;
        const info = {
          symbol: tokenData.symbol,
          name: tokenData.name,
          address: tokenAddress,
          decimals: tokenData.decimals || 9,
          liquidity: tokenData.liquidity,
          volume24h: tokenData.volume24h
        };

        this.tokenInfoCache.set(tokenAddress, {
          info,
          timestamp: Date.now()
        });

        return info;
      }

      // Return basic info if not found
      return {
        symbol: tokenAddress.slice(0, 6) + '...',
        name: 'Unknown Token',
        address: tokenAddress,
        decimals: 9
      };
    } catch (error) {
      logger.error('Error fetching token info:', error);
      throw error;
    }
  }

  async getMarketStats(tokenAddress) {
    try {
      // Try DexScreener first
      try {
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (response.data?.pairs?.[0]) {
          const pair = response.data.pairs[0];
          return {
            currentPrice: parseFloat(pair.priceUsd),
            priceChange24h: pair.priceChange?.h24 || 0,
            volume24h: pair.volume?.h24 || 0,
            liquidity: pair.liquidity?.usd || 0,
            fdv: pair.fdv || 0,
            symbol: pair.baseToken.symbol,
            name: pair.baseToken.name
          };
        }
      } catch (error) {
        logger.warn('DexScreener market stats fetch failed, trying Birdeye:', error);
      }

      // Fallback to Birdeye
      const [priceResponse, tokenResponse] = await Promise.all([
        axios.get(
          `https://public-api.birdeye.so/public/price?address=${tokenAddress}`,
          { headers: { 'X-API-KEY': this.BIRDEYE_API_KEY } }
        ),
        axios.get(
          `https://public-api.birdeye.so/public/token_metadata?address=${tokenAddress}`,
          { headers: { 'X-API-KEY': this.BIRDEYE_API_KEY } }
        )
      ]);

      if (priceResponse.data?.data && tokenResponse.data?.data) {
        const priceData = priceResponse.data.data;
        const tokenData = tokenResponse.data.data;

        return {
          currentPrice: parseFloat(priceData.value),
          priceChange24h: priceData.priceChange24h || 0,
          volume24h: tokenData.volume24h || 0,
          liquidity: tokenData.liquidity || 0,
          symbol: tokenData.symbol,
          name: tokenData.name
        };
      }

      throw new Error('Market stats not available');
    } catch (error) {
      logger.error('Error fetching market stats:', error);
      throw error;
    }
  }

  calculatePNL(entryPrice, currentPrice, amount) {
    try {
      const entry = new Decimal(entryPrice);
      const current = new Decimal(currentPrice);
      const qty = new Decimal(amount);

      const pnl = current.minus(entry).times(qty);
      const pnlPercentage = current.minus(entry).dividedBy(entry).times(100);

      return {
        pnl: pnl.toFixed(2),
        pnlPercentage: pnlPercentage.toFixed(2)
      };
    } catch (error) {
      logger.error('Error calculating PNL:', error);
      return {
        pnl: '0.00',
        pnlPercentage: '0.00'
      };
    }
  }

  updatePriceHistory(tokenAddress, price) {
    this.lastPrices.set(tokenAddress, {
      price,
      timestamp: Date.now()
    });
  }
}

export default new PriceService();