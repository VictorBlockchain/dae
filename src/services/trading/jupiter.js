import axios from 'axios';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getConnection } from '../../config/solana.js';
import logger from '../../utils/logger.js';
import { JUPITER_CONFIG } from '../../config/constants.js';
import { collectServiceFee } from './serviceFee.js';
import { getSOLBalance } from '../wallet/balance.js';
import adminService from '../admin/index.js';

const CONFIRMATION_TIMEOUT = 30000; // 30 seconds
const CONFIRMATION_CHECK_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const MIN_SOL_BALANCE = 0.015; // Minimum SOL balance to maintain

class JupiterService {
  constructor() {
    this.userSlippage = new Map();
  }

  setUserSlippage(userId, slippage) {
    if (slippage < JUPITER_CONFIG.MIN_SLIPPAGE || slippage > JUPITER_CONFIG.MAX_SLIPPAGE) {
      throw new Error(`Slippage must be between ${JUPITER_CONFIG.MIN_SLIPPAGE}% and ${JUPITER_CONFIG.MAX_SLIPPAGE}%`);
    }
    this.userSlippage.set(userId, slippage);
    return slippage;
  }

  getUserSlippage(userId) {
    return this.userSlippage.get(userId) || JUPITER_CONFIG.DEFAULT_SLIPPAGE;
  }

  async executeSwap(wallet, inputMint, outputMint, amount, userId, isUrgentSell = false) {
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        // Check balance before proceeding
        const balance = await getSOLBalance(wallet.publicKey);
        const serviceFee = adminService.getServiceFee();
        const totalRequired = (amount / 1e9) + serviceFee + 0.000005;

        if (!isUrgentSell && balance - totalRequired < MIN_SOL_BALANCE) {
          throw new Error(
            `Insufficient balance for trade. Required: ${totalRequired.toFixed(6)} SOL, ` +
            `Available: ${balance.toFixed(6)} SOL`
          );
        }

        // Collect service fee first
        await collectServiceFee(wallet, userId);

        // Get quote
        const slippage = isUrgentSell ? 
          JUPITER_CONFIG.MAX_SLIPPAGE : 
          this.getUserSlippage(userId);

        const slippageBps = Math.floor(slippage * 100);
        const quote = await this.getQuote(inputMint, outputMint, amount, slippageBps);

        // Get swap transaction
        const swapRequest = {
          userPublicKey: wallet.publicKey,
          quoteResponse: quote
        };

        logger.info('Requesting swap transaction...');
        
        const swapResponse = await axios.post(
          `${JUPITER_CONFIG.API_URL}/swap`,
          swapRequest,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );

        if (!swapResponse.data?.swapTransaction) {
          throw new Error('No swap transaction received');
        }

        // Execute swap
        const connection = await getConnection();
        const swapTransactionBuf = Buffer.from(swapResponse.data.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        transaction.sign([wallet.keypair]);

        logger.info('Sending swap transaction...');

        const signature = await connection.sendRawTransaction(transaction.serialize(), {
          skipPreflight: false,
          maxRetries: 2,
          preflightCommitment: 'confirmed'
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        logger.info(`Swap transaction confirmed: ${signature}`);

        return {
          signature,
          inputAmount: amount,
          outputAmount: quote.outAmount,
          price: quote.price,
          priceImpact: quote.priceImpactPct
        };

      } catch (error) {
        attempt++;
        
        if (attempt < MAX_RETRIES && (
          error.message.includes('blockhash not found') ||
          error.message.includes('timeout') ||
          error.message.includes('failed to send')
        )) {
          logger.warn(`Swap attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }

        throw new Error(`Swap failed: ${error.message}`);
      }
    }
  }

  async getQuote(inputMint, outputMint, amount, slippageBps) {
    try {
      const response = await axios.get(`${JUPITER_CONFIG.API_URL}/quote`, {
        params: {
          inputMint,
          outputMint,
          amount: amount.toString(),
          slippageBps: slippageBps.toString(),
          feeBps: "0",
          onlyDirectRoutes: false,
          asLegacyTransaction: false
        },
        timeout: 10000
      });

      if (!response.data) {
        throw new Error('No quote data received');
      }

      return response.data;
    } catch (error) {
      logger.error('Error getting Jupiter quote:', error);
      throw new Error(`Failed to get quote: ${error.message}`);
    }
  }
}

export default new JupiterService();