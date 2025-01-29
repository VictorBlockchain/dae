import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { Keypair } from "@solana/web3.js";
import crypto from "crypto";

const IV_LENGTH = 16; // AES block size

// Encryption and Decryption Class
class CryptoManager {
    private ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ;
  
  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      this.ENCRYPTION_KEY = crypto.randomBytes(32); // 256-bit key
      console.log("Generated ENCRYPTION_KEY:", this.ENCRYPTION_KEY.toString("hex"));
    } else {
      this.ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
    }
  }

  encrypt(text: string): { iv: string; encrypted: string } {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString("hex"), encrypted: encrypted.toString("hex") };
  }
  
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

export async function POST(req: Request) {
  try {
    const { user, botName } = await req.json();
    console.log(user, botName)
    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");

    // Check if bot already exists
    const existingBot = await botsCollection.findOne({ user });
    if (existingBot) {
      const { encryptedPrivateKey, ...responseBot } = existingBot;
      
      return NextResponse.json({ success: true, message: responseBot });
    }
    
    // Generate a new keypair for the bot
    const keypair = Keypair.generate();
    const privateKeyHex = Buffer.from(keypair.secretKey).toString("hex");

    // Encrypt the private key
    const { iv, encrypted } = cryptoManager.encrypt(privateKeyHex);
    
    // Prepare the bot document to store in MongoDB
    const bot = {
      user: user,
      botname: botName,
      botid: 1,
      publicKey: keypair.publicKey.toString(),
      encryptedPrivateKey: encrypted,
      iv: iv,
      power: 0,
      followers: [],
      following: [],
      token: null,
      tradesAuto: [],
      tradesCopy: [],
      tradesManual: [],
      statusTrade: false, // 0: inactive, 1: active
      statusCopy: false, // 0: inactive, 1: active
      slippage: 0,
      priority: 0,
      autoBuy: false,
      autoBuyAmount: 0,
      autoBuyTIme: 0,
      keywordTrades: false,
    };
    
    // Insert the new bot into the database
    await botsCollection.insertOne(bot);
    
    const { encryptedPrivateKey, ...responseBot } = bot;

    return NextResponse.json({ success: true, message: responseBot });

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to generate bot address" }, { status: 500 });
  }
}
