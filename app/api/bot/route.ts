import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js"

// Mock user ID for testing - in production this would be the user's Solana address
const MOCK_USER_ID = "11111111111111111111111111111111"

export async function PATCH(req: Request) {
  try {
    const { user,address, name } = await req.json()
    
    const client = await clientPromise
    const db = client.db("daemon")
    
    const result = await db.collection("bots").findOneAndUpdate(
      { address, owner_address: user },
      { $set: { name } },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      bot: result
    })
  } catch (error) {
    console.error("Failed to update bot:", error)
    return NextResponse.json(
      { error: "Failed to update bot" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    // Extract query parameters from the request URL
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('daemon');

    const bots = await db
      .collection('bots')
      .find({ owner_address: userId })
      .sort({ created_at: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      bots,
    });
  } catch (error) {
    console.error('Failed to get bots:', error);
    return NextResponse.json(
      { error: 'Failed to get bots' },
      { status: 500 }
    );
  }
}