import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

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

    // Get bot details and settings
    const bot = await db.collection("bots").findOne({ address: botAddress })
    if (!bot) {
      return NextResponse.json(
        { error: "Bot not found" },
        { status: 404 }
      )
    }

    // Get follower count
    const followerCount = await db.collection("bot_followers")
      .countDocuments({ lead_bot: botAddress })

    // Get trade statistics
    const trades = await db.collection("trades")
      .find({ botAddress })
      .toArray()

    const activeTrades = trades.filter(t => t.status === "active").length
    const totalTrades = trades.length
    
    // Calculate win rate
    const closedTrades = trades.filter(t => t.status === "closed")
    const winningTrades = closedTrades.filter(t => {
      const buyPrice = t.trade.quote.price
      const sellPrice = t.closePrice
      return sellPrice > buyPrice
    })
    const winRate = closedTrades.length > 0 
      ? (winningTrades.length / closedTrades.length) * 100 
      : 0

    // Calculate total P&L
    const totalPnL = closedTrades.reduce((acc, trade) => {
      const buyPrice = trade.trade.quote.price
      const sellPrice = trade.closePrice
      const amount = trade.trade.quote.outAmount
      return acc + ((sellPrice - buyPrice) * amount)
    }, 0)

    return NextResponse.json({
      success: true,
      stats: {
        name: bot.name,
        address: botAddress,
        followers: followerCount,
        settings: {
          stopLoss: bot.settings?.stopLoss || null,
          takeProfit: bot.settings?.takeProfit || null
        },
        trading: {
          activeTrades,
          totalTrades,
          winRate: winRate.toFixed(2),
          totalPnL: totalPnL.toFixed(4)
        }
      }
    })
  } catch (error) {
    console.error("Failed to get bot stats:", error)
    return NextResponse.json(
      { error: "Failed to get bot stats" },
      { status: 500 }
    )
  }
}