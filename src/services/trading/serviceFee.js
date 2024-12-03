import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection, getBlockhash } from '../../config/solana.js';
import logger from '../../utils/logger.js';
import adminService from '../admin/index.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export async function collectServiceFee(wallet, userId) {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const connection = await getConnection();
      const serviceFeeWallet = new PublicKey(process.env.SERVICE_FEE_WALLET);
      const serviceFee = adminService.getServiceFee();
      const feeLamports = Math.floor(serviceFee * LAMPORTS_PER_SOL);

      // Create fee transaction
      const feeTransaction = new Transaction();
      feeTransaction.add(
        SystemProgram.transfer({
          fromPubkey: wallet.keypair.publicKey,
          toPubkey: serviceFeeWallet,
          lamports: feeLamports
        })
      );

      // Get fresh blockhash
      const { blockhash, lastValidBlockHeight } = await getBlockhash(true);
      feeTransaction.recentBlockhash = blockhash;
      feeTransaction.feePayer = wallet.keypair.publicKey;

      // Sign and send transaction
      feeTransaction.sign(wallet.keypair);
      const signature = await connection.sendRawTransaction(feeTransaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
        preflightCommitment: 'confirmed'
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });

      if (confirmation.value.err) {
        throw new Error(`Fee transaction failed: ${confirmation.value.err}`);
      }

      logger.info(`Service fee collected for user ${userId}: ${serviceFee} SOL`);
      return signature;

    } catch (error) {
      attempt++;
      
      if (attempt < MAX_RETRIES) {
        logger.warn(`Service fee collection attempt ${attempt} failed, retrying in ${RETRY_DELAY}ms`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        continue;
      }

      logger.error('Error collecting service fee:', error);
      throw new Error(`Failed to collect service fee: ${error.message}`);
    }
  }
}