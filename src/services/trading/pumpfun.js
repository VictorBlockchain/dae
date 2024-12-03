import { VersionedTransaction } from '@solana/web3.js';
import logger from '../../utils/logger.js';
import { getConnection } from '../../config/solana.js';
import { collectServiceFee } from './serviceFee.js';
import { getSOLBalance } from '../wallet/balance.js';
import adminService from '../admin/index.js';

const MIN_SOL_BALANCE = 0.015;
const MIN_SOL_FOR_FEES = 0.000005;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

class PumpFunService {
  constructor() {
    this.API_URL = 'https://pumpportal.fun/api';
  }

  async executeSwap(wallet, tokenAddress, amount, action, userId, denominatedInSol = true) {
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        // Check balance before proceeding
        const balance = await getSOLBalance(wallet.publicKey);
        const serviceFee = adminService.getServiceFee();
        const totalRequired = denominatedInSol ? amount + serviceFee + MIN_SOL_FOR_FEES : serviceFee + MIN_SOL_FOR_FEES;

        if (action === 'buy' && balance - totalRequired < MIN_SOL_BALANCE) {
          throw new Error(
            `Insufficient balance for trade. Required: ${totalRequired.toFixed(6)} SOL, ` +
            `Available: ${balance.toFixed(6)} SOL`
          );
        }

        // Collect service fee first
        await collectServiceFee(wallet, userId);

        const response = await fetch(`${this.API_URL}/trade-local`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/octet-stream'
          },
          body: JSON.stringify({
            publicKey: wallet.publicKey.toString(),
            action: action,
            mint: tokenAddress,
            denominatedInSol: denominatedInSol,
            amount: parseFloat(amount),
            slippage: 10,
            priorityFee: 0.00001,
            pool: 'pump'
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Pump.fun API error: ${errorText}`);
        }

        const data = await response.arrayBuffer();
        if (!data || data.byteLength === 0) {
          throw new Error('Empty transaction data received from Pump.fun API');
        }

        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        
        // Sign transaction
        tx.sign([wallet.keypair]);

        // Send transaction
        const connection = await getConnection();
        const signature = await connection.sendRawTransaction(tx.serialize(), {
          skipPreflight: false,
          maxRetries: 2,
          preflightCommitment: 'confirmed'
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${confirmation.value.err}`);
        }

        logger.info(`Pump.fun ${action} executed:`, {
          signature,
          token: tokenAddress,
          amount: amount,
          user: userId
        });

        return {
          signature,
          success: true
        };

      } catch (error) {
        attempt++;
        
        if (attempt < MAX_RETRIES && (
          error.message.includes('blockhash not found') ||
          error.message.includes('timeout') ||
          error.message.includes('failed to send')
        )) {
          logger.warn(`Pump.fun trade attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          continue;
        }

        throw new Error(`Pump.fun trade failed: ${error.message}`);
      }
    }
  }
}

export default new PumpFunService();