// pages/api/trade/get-bot.ts

import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

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
        return NextResponse.json({
          success: true,
          message: daemon
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
