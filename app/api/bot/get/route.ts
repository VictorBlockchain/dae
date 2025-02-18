// pages/api/trade/get-bot.ts

import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import {SolanaManager} from "@/lib/solana";

export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url)
      const user = searchParams.get("user")
      if (!user) {
        return NextResponse.json({
        success: false,
        message: "User is required"
      })
      }
      
      // Connect to MongoDB
      const client = await clientPromise;
      const db = client.db("daemon");

      // Find the bot associated with the user
      const daemon = await db.collection("bots").findOne({ user });
      
      if (daemon) {
        
        const dae:any = process.env.NEXT_PUBLIC_DAE;
        const solana = new SolanaManager();
        const balanceSol = await solana.getBalance(daemon.publicKey).catch(() => 0);
        const balanceToken = await solana.getTokenBalance(daemon.publicKey, dae).catch(() => 0);
            
        const { encryptedPrivateKey, ...responseBot } = daemon;
        
        return NextResponse.json({
          success: true,
          message: responseBot,
          balanceSol:balanceSol || 0,
          balanceToken:balanceToken || 0
        })
      } else {
        return NextResponse.json({
          success: false,
          message: "active a bot 1st"
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
