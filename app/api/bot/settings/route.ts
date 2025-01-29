import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const MOCK_USER_ID = "11111111111111111111111111111111"

export async function POST(req: Request) {
  try {
    const { botAddress, settings } = await req.json()
    
    if (!botAddress) {
      return NextResponse.json(
        { error: "Bot address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")
    
    // Verify bot ownership
    const bot = await db.collection("bots").findOne({
      address: botAddress,
      owner_address: MOCK_USER_ID
    })

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found or unauthorized" },
        { status: 404 }
      )
    }

    // Validate stop loss and take profit
    if (settings.stopLoss && (settings.stopLoss <= 0 || settings.stopLoss > 100)) {
      return NextResponse.json(
        { error: "Stop loss must be between 0 and 100" },
        { status: 400 }
      )
    }

    if (settings.takeProfit && (settings.takeProfit <= 0 || settings.takeProfit > 1000)) {
      return NextResponse.json(
        { error: "Take profit must be between 0 and 1000" },
        { status: 400 }
      )
    }

    // Update bot settings
    await db.collection("bots").updateOne(
      { address: botAddress },
      { 
        $set: { 
          settings: {
            ...bot.settings,
            ...settings,
            updatedAt: new Date()
          }
        } 
      }
    )

    return NextResponse.json({
      success: true,
      settings: {
        ...bot.settings,
        ...settings
      }
    })
  } catch (error) {
    console.error("Failed to update settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const botAddress = searchParams.get("address")

    if (!botAddress) {
      return NextResponse.json(
        { error: "Bot address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")
    
    const bot = await db.collection("bots").findOne({
      address: botAddress,
      owner_address: MOCK_USER_ID
    })

    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found or unauthorized" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: bot.settings || {}
    })
  } catch (error) {
    console.error("Failed to get settings:", error)
    return NextResponse.json(
      { error: "Failed to get settings" },
      { status: 500 }
    )
  }
}