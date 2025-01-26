import { NextResponse } from "next/server"
import clientPromise from "../../lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("daeai")

    const wallet = await db.collection("wallets").findOne({})

    return NextResponse.json({
      solana: wallet?.solanaBalance || 0,
      dae: wallet?.daeBalance || 0,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch wallet balance" }, { status: 500 })
  }
}

