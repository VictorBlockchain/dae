import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("daemon")

    // Get all bots with their follower counts
    const pipeline = [
      {
        $lookup: {
          from: "bot_followers",
          localField: "address",
          foreignField: "lead_bot",
          as: "followers"
        }
      },
      {
        $lookup: {
          from: "trades",
          localField: "address",
          foreignField: "botAddress",
          as: "trades"
        }
      },
      {
        $addFields: {
          followerCount: { $size: "$followers" },
          activeTrades: {
            $size: {
              $filter: {
                input: "$trades",
                as: "trade",
                cond: { $eq: ["$$trade.status", "active"] }
              }
            }
          },
          totalTrades: { $size: "$trades" },
          winningTrades: {
            $size: {
              $filter: {
                input: "$trades",
                as: "trade",
                cond: { 
                  $and: [
                    { $eq: ["$$trade.status", "closed"] },
                    { $gt: ["$$trade.closePrice", "$$trade.trade.quote.price"] }
                  ]
                }
              }
            }
          }
        }
      },
      {
        $project: {
          address: 1,
          name: 1,
          status: 1,
          settings: 1,
          followerCount: 1,
          activeTrades: 1,
          totalTrades: 1,
          winRate: {
            $cond: [
              { $eq: ["$totalTrades", 0] },
              0,
              {
                $multiply: [
                  { $divide: ["$winningTrades", "$totalTrades"] },
                  100
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          followerCount: { $gt: 0 },
          status: { $ne: "stopped" }
        }
      },
      {
        $sort: { followerCount: -1, winRate: -1 }
      },
      {
        $limit: 10
      }
    ]

    const leaderboard = await db.collection("bots").aggregate(pipeline).toArray()

    return NextResponse.json({
      success: true,
      leaderboard: leaderboard.map(bot => ({
        ...bot,
        winRate: Number(bot.winRate.toFixed(2))
      }))
    })
  } catch (error) {
    console.error("Failed to get leaderboard:", error)
    return NextResponse.json(
      { error: "Failed to get leaderboard" },
      { status: 500 }
    )
  }
}