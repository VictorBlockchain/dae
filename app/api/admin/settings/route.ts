import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Admin middleware
async function isAdmin(walletAddress: string): Promise<boolean> {
  return walletAddress === process.env.ADMIN_SOLANA_ADDRESS
}

export async function POST(req: Request) {
  try {
    const { walletAddress, setting, value } = await req.json()
    
    if (!walletAddress || !setting) {
      return NextResponse.json(
        { error: "Wallet address and setting required" },
        { status: 400 }
      )
    }
    
    // Verify admin
    if (!await isAdmin(walletAddress)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    // Validate fee settings
    if (setting === 'tradingFee') {
      const fee = parseFloat(value)
      if (isNaN(fee) || fee < 0 || fee > 1) {
        return NextResponse.json(
          { error: "Fee must be between 0 and 1 SOL" },
          { status: 400 }
        )
      }
    }
    
    const client = await clientPromise
    const db = client.db("daemon")

    // Update setting
    await db.collection("settings").updateOne(
      { key: setting },
      { 
        $set: { 
          value,
          updatedAt: new Date(),
          updatedBy: walletAddress
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      setting,
      value
    })
  } catch (error) {
    console.error("Failed to update setting:", error)
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const walletAddress = searchParams.get("wallet")
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      )
    }
    
    // Verify admin
    if (!await isAdmin(walletAddress)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const client = await clientPromise
    const db = client.db("daemon")
    
    const settings = await db.collection("settings").find().toArray()
    
    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error) {
    console.error("Failed to get settings:", error)
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    )
  }
}