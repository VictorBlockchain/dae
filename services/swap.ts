import { Connection, Keypair, PublicKey, Transaction,sendAndConfirmTransaction,VersionedTransaction } from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import axios from "axios";

class SwapService {
  private connection: Connection;
  private raydium: Raydium;

  constructor() {
    this.connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  }

  async getMarketInfo(baseMint: string, quoteMint: string) {
    const url = `https://api.raydium.io/v1/markets?baseMint=${baseMint}&quoteMint=${quoteMint}`;
    const response = await axios.get(url);
    return response.data[0]; // Return the first market (if multiple exist)
  }
  
  async createSwapTransaction(
    userPublicKey: string,
    baseMint: string,
    quoteMint: string,
    amountIn: number, // Amount of base token to swap
    slippage: number // Slippage tolerance (e.g., 0.01 for 1%)
  ) {
    const market = await this.getMarketInfo(baseMint, quoteMint);
  
    const url = "https://api.raydium.io/v1/swap";
    const payload = {
      userPublicKey,
      baseMint,
      quoteMint,
      amountIn,
      slippage,
      marketAddress: market.address,
    };
  
    const response = await axios.post(url, payload);
    return response.data.transaction; // Serialized transaction
  }
  
  async sendTransaction(serializedTransaction: string, userWallet: Keypair) {
    const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  
    // Deserialize the transaction
    const transaction = Transaction.from(Buffer.from(serializedTransaction, "base64"));
  
    // Sign the transaction
    transaction.sign(userWallet);
  
    // Send and confirm the transaction
    const signature = await connection.sendRawTransaction(transaction.serialize());
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
  
    return signature;
  }

  async sendTransactionWithRetry(transaction: Transaction, userWallet: Keypair, maxRetries = 5) {
    let retries = 0;
    while (retries < maxRetries) {
      try {
        // Sign the transaction
        transaction.sign(userWallet);
  
        // Send and confirm the transaction
        const signature = await sendAndConfirmTransaction(this.connection, transaction, [userWallet]);        
        const confirmation = await this.connection.confirmTransaction(
            {
              signature,
              commitment: "confirmed",
            }
          );  
        if (confirmation.value.err) {
          throw new Error("Transaction failed");
        }
  
        return signature;
      } catch (error: any) {
        console.error(`Attempt ${retries + 1} failed:`, error);
  
        // Handle specific errors
        if (error.message.includes("Insufficient funds")) {
          throw new Error("Insufficient funds. Please top up your wallet.");
        }
  
        retries++;
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries))); // Exponential backoff
      }
    }
    throw new Error("Max retries reached. Transaction failed.");
  }
  
  async  executeSwap(
    userWallet: Keypair,
    baseMint: string, // Token to swap from (e.g., SOL)
    quoteMint: string, // Token to swap to (e.g., USDC)
    amountIn: number, // Amount of base token to swap
    slippage: number // Slippage tolerance (e.g., 0.01 for 1%)
  ) {
    try {
      // Create the swap transaction
      const serializedTransaction = await this.createSwapTransaction(
        userWallet.publicKey.toString(),
        baseMint,
        quoteMint,
        amountIn,
        slippage
      );
  
      // Sign and send the transaction
      const signature = await this.sendTransaction(serializedTransaction, userWallet);
  
      return { success: true, message: `Swap executed successfully. Signature: ${signature}` };
    } catch (error:any) {
      return { success: false, message: error.message };
    }
  }

  async  executeSwapPump(
    userWallet: Keypair,
    token: string, // Token to swap from (e.g., SOL)
    amountIn: number, // Amount of base token to swap
    slippage: any, // Slippage tolerance (e.g., 0.01 for 1%)
    priorityFee: any,
    type: number,
  ) {
    try {
      // Create the swap transaction
      let action = "buy";
      let denominatedInSol = "true";
      if(type === 2){
        action = "sell";
        denominatedInSol = "false";
      }
      const response = await fetch(`https://pumpportal.fun/api/trade-local`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "publicKey": userWallet.publicKey.toString(),  // Your wallet public key
            "action": action,                 // "buy" or "sell"
            "mint": token,         // contract address of the token you want to trade
            "denominatedInSol": denominatedInSol,     // "true" if amount is amount of SOL, "false" if amount is number of tokens
            "amount": amountIn,                  // amount of SOL or tokens
            "slippage": slippage,                  // percent slippage allowed
            "priorityFee": priorityFee,          // priority fee
            "pool": "pump"                   // exchange to trade on. "pump", "raydium" or "auto"
        })
    });
    if(response.status === 200){ // successfully generated transaction
        const data = await response.arrayBuffer();
        const tx = VersionedTransaction.deserialize(new Uint8Array(data));
        const signerKeyPair = Keypair;
        tx.sign([signerKeyPair]);
        const signature = await this.connection.sendTransaction(tx)
        console.log("Transaction: https://solscan.io/tx/" + signature);
    } else {
        console.log(response.statusText); // log error
    }
} catch (error:any) {
      return { success: false, message: error.message };
    }
  }
}

export default SwapService;