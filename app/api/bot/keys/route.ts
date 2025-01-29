import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import crypto from "crypto";

// Encryption settings
const IV_LENGTH = 16;

class CryptoManager {
  private ENCRYPTION_KEY: process.env.ENCRYPTION_KEY;

  constructor() {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("Missing ENCRYPTION_KEY in environment variables");
    }
    this.ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex");
    
    if (this.ENCRYPTION_KEY.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be a 32-byte hexadecimal string");
    }
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
export async function GET(req: Request) {
    
    try {
      const { searchParams } = new URL(req.url)
      const user = searchParams.get("user")
      if (!user) {
        return NextResponse.json({
        success: true,
        message: "User is required"
      })
      }
      
      // Connect to MongoDB
      const client = await clientPromise;
      const db = client.db("daemon");

      // Find the bot associated with the user
      const daemon = await db.collection("bots").findOne({ user });

      if (daemon) {
        
        const cryptoManager = new CryptoManager();
        const privateKey = cryptoManager.decrypt(
          daemon.encryptedPrivateKey,
          daemon.iv,
        );
        
        return NextResponse.json({
          success: true,
          privateKey,
        });

      } else {
        return NextResponse.json({
          success: true,
          message: "no bots activated"
        })
      }
    } catch (error) {
      console.error("Error in /api/trade/get-bot:", error);
      return NextResponse.json({
        success: true,
        message: "internal server error"
      })
    }

}

