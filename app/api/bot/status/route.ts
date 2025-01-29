import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { botAddress, status } = await req.json()
    
    if (!botAddress) {
      return NextResponse.json(
        { error: "Bot address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Update bot status
    const result = await db.collection("bots").updateOne(
      { address: botAddress },
      { 
        $set: { 
          status,
          updatedAt: new Date(),
          activeToken: status === "stopped" ? null : undefined // Clear activeToken when stopped
        } 
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      )
    }

    // If stopping, remove all followers
    if (status === "stopped") {
      await db.collection("bot_followers").deleteMany({
        follower_bot: botAddress
      })
    }

    return NextResponse.json({
      success: true,
      status
    })
  } catch (error) {
    console.error("Failed to update bot status:", error)
    return NextResponse.json(
      { error: "Failed to update bot status" },
      { status: 500 }
    )
  }
}