import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection } from '../../config/solana.js';
import { getSOLBalance } from './balance.js';
import logger from '../../utils/logger.js';

export async function withdrawFunds(wallet, amount, destinationAddress) {
  try {
    const connection = await getConnection();
    const currentBalance = await getSOLBalance(wallet.publicKey);
    const withdrawAmount = amount * LAMPORTS_PER_SOL;
    const transactionFee = 0.000005 * LAMPORTS_PER_SOL; // Typical Solana transaction fee

    // Check if balance is sufficient including transaction fee
    if (currentBalance * LAMPORTS_PER_SOL < withdrawAmount + transactionFee) {
      throw new Error(`Insufficient balance. Required: ${amount + 0.000005} SOL, Available: ${currentBalance} SOL`);
    }

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(wallet.publicKey),
        toPubkey: new PublicKey(destinationAddress),
        lamports: withdrawAmount
      })
    );

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new PublicKey(wallet.publicKey);

    const signature = await connection.sendTransaction(transaction, [wallet.keypair]);
    await connection.confirmTransaction(signature);
    
    logger.info(`Withdrawal executed: ${signature}`);
    return signature;
  } catch (error) {
    logger.error('Withdrawal error:', error);
    throw error;
  }
}