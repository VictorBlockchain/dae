import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js"
import {  TOKEN_PROGRAM_ID } from "@solana/spl-token";
import crypto from "crypto";
import mongoose from "mongoose";
import Bot from "./models/bot"; 
// Connect to MongoDB
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}
mongoose.connect(process.env.MONGODB_URI);



if (!process.env.ENCRYPTION_KEY) {
  const ENCRYPTION_KEY = crypto.randomBytes(32); // 256-bit key
  console.log("ENCRYPTION_KEY:", ENCRYPTION_KEY.toString("hex"));
}
// Encryption key (store this securely, e.g., in environment variables)
const ENCRYPTION_KEY:any = process.env.ENCRYPTION_KEY // 256-bit key
const IV_LENGTH = 16; // AES block size

export class SolanaManager {
  private connection: Connection
  
  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")
  }
  
  // Function to encrypt data
  encrypt(text: string): { iv: string; encrypted: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encrypted: encrypted.toString("hex") };
  }
  
  // Function to decrypt data
decrypt(encrypted: string, iv: string): string {
  const ivBuffer = Buffer.from(iv, "hex");
  const encryptedBuffer = Buffer.from(encrypted, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), ivBuffer);
  let decrypted = decipher.update(encryptedBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
  
async generateBotAddress(user:string, name:string):  Promise<any> {
    
    const existingBot = await Bot.findOne({ user});
    if (existingBot) {
      return {success: false, message: "Bot already exists"};
    }
    
    const keypair = Keypair.generate();
    // Encrypt the private key
    const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");
    const { iv, encrypted } = this.encrypt(privateKeyHex);
    // Store the public key, encrypted private key, and IV in MongoDB

    const bot = new Bot({
      user: user,
      botname: name,
      botid: 1,
      publicKey: keypair.publicKey.toString(),
      encryptedPrivateKey: encrypted,
      iv: iv,
      power: 0,
      followers: [],
      following: [],
      token: null,
      trades: [],
      active: 0,
      slippage: 1,
      prority: 1
    });
    
    await bot.save();
    return {success: true, message: keypair.publicKey.toString()};
  
  }
  
  // Function to fetch and decrypt the private key
async getBotPrivateKey(publicKey: string): Promise<Uint8Array> {
  const bot:any = await Bot.findOne({ publicKey });
  if (!bot) {
    throw new Error("Bot not found");
  }

  // Decrypt the private key
  const privateKeyHex = this.decrypt(bot.encryptedPrivateKey, bot.iv);
  return Uint8Array.from(Buffer.from(privateKeyHex, "hex"));
}
  
  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address)
      const balance = await this.connection.getBalance(publicKey)
      return balance / 10 ** 9 // Convert lamports to SOL
    } catch (error) {
      console.error("Failed to get balance:", error)
      return 0
    }
  }

  async getTokenBalance(userAddress: string, tokenMintAddress: string): Promise<number> {
    try {
      const userPublicKey = new PublicKey(userAddress);
      const tokenMintPublicKey = new PublicKey(tokenMintAddress);

      // Get the associated token account for the user and token mint
      const associatedTokenAccount = await Token.getAssociatedTokenAddress(
        TOKEN_PROGRAM_ID,
        tokenMintPublicKey,
        userPublicKey
      );

      // Fetch the token account info
      const tokenAccountInfo = await this.connection.getTokenAccountBalance(associatedTokenAccount);

      // Return the token balance
      return tokenAccountInfo.value.amount;
    } catch (error) {
      console.error("Failed to get token balance:", error);
      return 0; // Return 0 if the token account doesn't exist or an error occurs
    }
  }
  
  // async transferTokens(
  //   fromKeypair: Keypair,
  //   toAddress: string,
  //   amount: number
  // ): Promise<boolean> {
  //   try {
  //     const transaction = new Transaction().add(
  //       SystemProgram.transfer({
  //         fromPubkey: fromKeypair.publicKey,
  //         toPubkey: new PublicKey(toAddress),
  //         lamports: amount * 10 ** 9
  //       })
  //     )

  //     const signature = await this.connection.sendTransaction(transaction, [fromKeypair])
  //     await this.connection.confirmTransaction(signature)
  //     return true
  //   } catch (error) {
  //     console.error("Transfer failed:", error)
  //     return false
  //   }
  // }

  // Function to send a transaction using the decrypted private key
async transferTokens(publicKey: string, destination: string, amount: number): Promise<boolean> {
  try {

    const privateKey = await this.getBotPrivateKey(publicKey);
    const keypair = Keypair.fromSecretKey(privateKey);
    
    const connection:any = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: new PublicKey(destination),
        lamports: amount * 10 ** 9,
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [keypair]);
    await connection.confirmTransaction(signature);
    return true
    console.log("Transaction sent with signature:", signature);
  
    } catch (error) {
      console.error("Failed to get bot private key:", error);
      return false;
    }

  }
}