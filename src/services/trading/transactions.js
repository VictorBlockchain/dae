import { Transaction, PublicKey, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { getConnection, getBlockhash, confirmTransaction } from '../../config/solana.js';
import axios from 'axios';
import logger from '../../utils/logger.js';
import { getSOLBalance } from '../wallet/balance.js';
import adminService from '../admin/index.js';
import { parsePublicKey } from '../../utils/publicKey.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const RAYDIUM_API = 'https://api.raydium.io/v2';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function sendAndConfirmTransaction(connection, transaction, signers, options = {}) {
  const { blockhash, lastValidBlockHeight } = await getBlockhash(true);
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = signers[0].publicKey;

  transaction.sign(...signers);
  
  const rawTransaction = transaction.serialize();
  
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    maxRetries: 3,
    preflightCommitment: 'confirmed',
    ...options
  });

  const confirmation = await confirmTransaction(
    signature,
    blockhash,
    lastValidBlockHeight
  );

  if (confirmation?.value?.err) {
    throw new Error(`Transaction failed: ${confirmation.value.err}`);
  }

  return signature;
}

async function executeTransaction(wallet, amount, type, tokenAddress, tokenInfo = null) {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const connection = await getConnection();
      
      // Parse public keys
      const walletPubKey = parsePublicKey(wallet.publicKey);
      const serviceFeeWallet = new PublicKey(process.env.SERVICE_FEE_WALLET);

      // Verify balance
      const balance = await getSOLBalance(walletPubKey);
      const serviceFee = adminService.getServiceFee();
      const totalRequired = amount + serviceFee;
      
      if (balance < totalRequired) {
        throw new Error(
          `Insufficient balance. Required: ${totalRequired} SOL ` +
          `(including ${serviceFee} SOL fee), Available: ${balance} SOL`
        );
      }

      // Calculate swap amount
      const swapAmount = amount - serviceFee;
      const inputAmount = Math.floor(swapAmount * LAMPORTS_PER_SOL);

      if (isNaN(inputAmount) || inputAmount <= 0) {
        throw new Error('Invalid swap amount');
      }

      // Handle service fee transaction first
      const feeTransaction = new Transaction();
      const feeLamports = Math.floor(serviceFee * LAMPORTS_PER_SOL);
      
      feeTransaction.add(
        SystemProgram.transfer({
          fromPubkey: walletPubKey,
          toPubkey: serviceFeeWallet,
          lamports: feeLamports
        })
      );

      logger.info('Sending service fee transaction...');
      const feeSignature = await sendAndConfirmTransaction(
        connection,
        feeTransaction,
        [wallet.keypair]
      );
      logger.info('Service fee transaction confirmed:', feeSignature);

      // Get Raydium swap route
      logger.info('Requesting Raydium swap route...');
      const routeResponse = await axios.get(`${RAYDIUM_API}/route`, {
        params: {
          inputMint: type === 'buy' ? SOL_MINT : tokenAddress,
          outputMint: type === 'buy' ? tokenAddress : SOL_MINT,
          amount: inputAmount.toString(),
          slippage: 1, // 1% slippage
          version: 2
        }
      });

      if (!routeResponse.data?.success) {
        throw new Error('Failed to get swap route');
      }

      const route = routeResponse.data;

      // Get swap transaction
      logger.info('Requesting swap transaction...');
      const swapResponse = await axios.post(`${RAYDIUM_API}/swap`, {
        route,
        userPublicKey: walletPubKey.toString()
      });

      if (!swapResponse.data?.success || !swapResponse.data?.txData) {
        throw new Error('Failed to get swap transaction');
      }

      // Deserialize and handle swap transaction
      const swapTx = Transaction.from(
        Buffer.from(swapResponse.data.txData, 'base64')
      );

      logger.info('Sending swap transaction...');
      const signature = await sendAndConfirmTransaction(
        connection,
        swapTx,
        [wallet.keypair]
      );
      logger.info('Swap transaction confirmed:', signature);

      const tradeInfo = {
        type,
        token: tokenInfo || {
          address: tokenAddress,
          symbol: 'UNKNOWN',
          name: 'Unknown Token'
        },
        amount: swapAmount,
        serviceFee,
        timestamp: Date.now(),
        signature
      };

      logger.info('Trade executed successfully:', tradeInfo);
      return { signature, tradeInfo };
    } catch (error) {
      attempt++;
      
      if (error.response) {
        logger.error('API error:', {
          status: error.response.status,
          data: error.response.data
        });
        
        // Don't retry on API errors
        throw new Error(`API error: ${error.response.data?.message || error.message}`);
      }

      logger.error(`Transaction attempt ${attempt} failed:`, error);

      if (attempt < MAX_RETRIES) {
        logger.info(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      throw error;
    }
  }
}

async function getTradeHistory(walletAddress, limit = 10) {
  try {
    const connection = await getConnection();
    const pubKey = parsePublicKey(walletAddress);
    
    const signatures = await connection.getSignaturesForAddress(
      pubKey,
      { limit }
    );
    
    return signatures.map(sig => ({
      signature: sig.signature,
      timestamp: sig.blockTime ? new Date(sig.blockTime * 1000) : new Date(),
      status: sig.confirmationStatus
    }));
  } catch (error) {
    logger.error('Error fetching trade history:', error);
    return [];
  }
}

export {
  executeTransaction,
  getTradeHistory
};