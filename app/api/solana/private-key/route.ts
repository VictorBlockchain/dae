import { NextResponse } from "next/server";
import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";
import mongoose from "mongoose";
import Bot from "@/lib/models/bot"; 

const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined");
}
mongoose.connect(process.env.MONGODB_URI);

const IV_LENGTH = 16; // AES block size
if (!process.env.ENCRYPTION_KEY) {
  const ENCRYPTION_KEY = crypto.randomBytes(32); // 256-bit key
  console.log("ENCRYPTION_KEY:", ENCRYPTION_KEY.toString("hex"));
}
// Class for encryption/decryption
class CryptoManager {
  private ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      // Generate a random key if not set in environment
      this.ENCRYPTION_KEY = crypto.randomBytes(32); // 256-bit key
      console.log("Generated ENCRYPTION_KEY:", this.ENCRYPTION_KEY.toString("hex"));
    } else {
      this.ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
    }
  }

  // Function to encrypt data
  encrypt(text: string): { iv: string; encrypted: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encrypted: encrypted.toString("hex") };
  }

  // Function to decrypt data
  decrypt(encrypted: string, iv: string): string {
    const ivBuffer = Buffer.from(iv, "hex");
    const encryptedBuffer = Buffer.from(encrypted, "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.ENCRYPTION_KEY, ivBuffer);
    let decrypted = decipher.update(encryptedBuffer);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  }
}

const cryptoManager = new CryptoManager();

export async function GET(req: Request) {
  try {
    const { address } = await req.json(); // User's address to fetch bot
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");
    const existingBot:any = await botsCollection.findOne({ address });
    if (existingBot) {
      return NextResponse.json({ success: false, message: "Bot already exists" });
    }
    
    // Decrypt the private key using the crypto manager
    const privateKeyHex = cryptoManager.decrypt(existingBot.encryptedPrivateKey, bot.iv);
    
    // Convert the private key back to a Uint8Array
    return Uint8Array.from(Buffer.from(privateKeyHex, "hex"));

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch bot details" }, { status: 500 });
  }
}
