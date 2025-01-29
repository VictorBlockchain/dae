import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

let isListeningActive = false
let listenerInterval: NodeJS.Timeout | null = null

async function checkNewListings(db: any) {
  try {
    const response = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
      method: 'GET',
      headers: {},
    })

    if (!response.ok) {
      throw new Error('DexScreener API request failed')
    }

    const data = await response.json()
    const listingWords = await db.collection("listing_words")
      .find()
      .toArray()
    const words = listingWords.map(w => w.word.toLowerCase())

    // Check each listing against our keywords
    for (const listing of data) {
      const description = listing.description?.toLowerCase() || ''
      const matchedWords = words.filter(word => description.includes(word))

      if (matchedWords.length > 0) {
        // Get all bots with listings enabled
        const bots = await db.collection("bots")
          .find({ listingsEnabled: true })
          .toArray()

        // Execute buy orders for each bot
        for (const bot of bots) {
          try {
            const response = await fetch("/api/bot/trade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                botAddress: bot.address,
                tokenAddress: listing.tokenAddress,
                type: "buy",
                amount: 0.1, // Default buy amount
                slippage: 1 // Higher slippage for new listings
              })
            })

            if (response.ok) {
              // Store listing match
              await db.collection("listing_matches").insertOne({
                botAddress: bot.address,
                tokenAddress: listing.tokenAddress,
                matchedWords,
                listing,
                created_at: new Date()
              })
            }
          } catch (error) {
            console.error(`Failed to execute buy for bot ${bot.address}:`, error)
          }
        }
      }
    }
  } catch (error) {
    console.error("Failed to check listings:", error)
  }
}

export async function POST(req: Request) {
  try {
    const { action, botAddress } = await req.json()
    
    if (!action || !botAddress) {
      return NextResponse.json(
        { error: "Action and bot address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    if (action === "enable") {
      // Enable listings for bot
      await db.collection("bots").updateOne(
        { address: botAddress },
        { $set: { listingsEnabled: true } }
      )

      // Start global listener if not already running
      if (!isListeningActive) {
        isListeningActive = true
        listenerInterval = setInterval(() => checkNewListings(db), 60000) // Check every minute
      }

      return NextResponse.json({
        success: true,
        message: "Listings enabled"
      })
    } else if (action === "disable") {
      // Disable listings for bot
      await db.collection("bots").updateOne(
        { address: botAddress },
        { $set: { listingsEnabled: false } }
      )

      // Check if any bots still have listings enabled
      const activeBots = await db.collection("bots")
        .countDocuments({ listingsEnabled: true })

      if (activeBots === 0 && listenerInterval) {
        clearInterval(listenerInterval)
        isListeningActive = false
      }

      return NextResponse.json({
        success: true,
        message: "Listings disabled"
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Failed to update listings status:", error)
    return NextResponse.json(
      { error: "Failed to update listings status" },
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

    const bot = await db.collection("bots").findOne(
      { address: botAddress },
      { projection: { listingsEnabled: 1 } }
    )

    // Get recent matches for this bot
    const matches = await db.collection("listing_matches")
      .find({ botAddress })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray()

    return NextResponse.json({
      success: true,
      listingsEnabled: bot?.listingsEnabled || false,
      matches
    })
  } catch (error) {
    console.error("Failed to get listings status:", error)
    return NextResponse.json(
      { error: "Failed to get listings status" },
      { status: 500 }
    )
  }
}