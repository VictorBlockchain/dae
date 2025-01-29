import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const MOCK_USER_ID = "11111111111111111111111111111111"

export async function POST(req: Request) {
  try {
    const { botAddress, followerAddress } = await req.json()
    
    if (!botAddress || !followerAddress) {
      return NextResponse.json(
        { error: "Bot address and follower address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Verify both bots exist
    const [leadBot, followerBot] = await Promise.all([
      db.collection("bots").findOne({ address: botAddress }),
      db.collection("bots").findOne({ address: followerAddress })
    ])

    if (!leadBot || !followerBot) {
      return NextResponse.json(
        { error: "One or both bots not found" },
        { status: 404 }
      )
    }

    // Add follower relationship
    await db.collection("bot_followers").insertOne({
      lead_bot: botAddress,
      follower_bot: followerAddress,
      created_at: new Date(),
      settings: {
        copyTrades: true,
        stopLoss: null,
        takeProfit: null
      }
    })

    return NextResponse.json({
      success: true,
      message: "Follower added successfully"
    })
  } catch (error) {
    console.error("Failed to add follower:", error)
    return NextResponse.json(
      { error: "Failed to add follower" },
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

    const followers = await db.collection("bot_followers")
      .find({ lead_bot: botAddress })
      .toArray()

    return NextResponse.json({
      success: true,
      followers
    })
  } catch (error) {
    console.error("Failed to get followers:", error)
    return NextResponse.json(
      { error: "Failed to get followers" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { followerAddress } = await req.json()
    
    if (!followerAddress) {
      return NextResponse.json(
        { error: "Follower address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Remove all following relationships for this bot
    await db.collection("bot_followers").deleteMany({
      follower_bot: followerAddress
    })

    return NextResponse.json({
      success: true,
      message: "Following relationships removed"
    })
  } catch (error) {
    console.error("Failed to remove followers:", error)
    return NextResponse.json(
      { error: "Failed to remove followers" },
      { status: 500 }
    )
  }
}