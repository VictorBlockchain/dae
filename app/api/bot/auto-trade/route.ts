import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Connection, PublicKey } from "@solana/web3.js"

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")

// Store active intervals
const activeIntervals: { [key: string]: NodeJS.Timeout } = {}

// Minimum SOL balance required for trading (0.05 SOL)
const MIN_SOL_BALANCE = 0.05

async function checkBalance(botAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(botAddress)
    const balance = await connection.getBalance(publicKey)
    return balance / 10 ** 9 // Convert lamports to SOL
  } catch (error) {
    console.error("Failed to get balance:", error)
    throw error
  }
}

async function sellAllTokens(db: any, botAddress: string, tokenAddress: string) {
  try {
    const response = await fetch("/api/bot/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botAddress,
        tokenAddress,
        type: "sell",
        amount: "all"
      })
    })

    if (!response.ok) {
      throw new Error("Sell all failed")
    }

    return await response.json()
  } catch (error) {
    console.error("Failed to sell all tokens:", error)
    throw error
  }
}

async function executeTrade(db: any, botAddress: string, tokenAddress: string) {
  try {
    // Check SOL balance first
    const balance = await checkBalance(botAddress)
    
    if (balance < MIN_SOL_BALANCE) {
      console.log(`Low balance detected (${balance} SOL). Selling all tokens.`)
      await sellAllTokens(db, botAddress, tokenAddress)
      return {
        success: true,
        message: "Low balance detected. Sold all tokens."
      }
    }

    // Execute normal trade
    const response = await fetch("/api/bot/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botAddress,
        tokenAddress,
        type: Math.random() > 0.5 ? "buy" : "sell",
        amount: Math.random() * 0.1 // Random amount between 0-0.1 SOL
      })
    })

    if (!response.ok) {
      throw new Error("Trade failed")
    }

    return await response.json()
  } catch (error) {
    console.error("Auto trade failed:", error)
    throw error
  }
}

async function executePumpFunTrade(db: any, botAddress: string, tokenAddress: string) {
  try {
    // Check SOL balance first
    const balance = await checkBalance(botAddress)
    
    if (balance < MIN_SOL_BALANCE) {
      console.log(`Low balance detected (${balance} SOL). Selling all tokens.`)
      await sellAllTokens(db, botAddress, tokenAddress)
      return {
        success: true,
        message: "Low balance detected. Sold all tokens."
      }
    }

    // Simulate pump and dump pattern
    const phase = Math.random()
    
    if (phase < 0.6) { // 60% chance to buy
      const response = await fetch("/api/bot/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botAddress,
          tokenAddress,
          type: "buy",
          amount: 0.05 + (Math.random() * 0.15) // 0.05-0.2 SOL
        })
      })

      if (!response.ok) {
        throw new Error("Buy trade failed")
      }
    } else { // 40% chance to sell
      const response = await fetch("/api/bot/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botAddress,
          tokenAddress,
          type: "sell",
          amount: "all"
        })
      })

      if (!response.ok) {
        throw new Error("Sell trade failed")
      }
    }
  } catch (error) {
    console.error("Pump fun trade failed:", error)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const { botAddress, tokenAddress, action, interval, type } = await req.json()
    
    if (!botAddress || !tokenAddress) {
      return NextResponse.json(
        { error: "Bot address and token address required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Stop existing interval if any
    if (activeIntervals[botAddress]) {
      clearInterval(activeIntervals[botAddress])
      delete activeIntervals[botAddress]
    }

    if (action === "start") {
      if (!interval) {
        return NextResponse.json(
          { error: "Interval required for start action" },
          { status: 400 }
        )
      }

      // Check initial balance
      const balance = await checkBalance(botAddress)
      if (balance < MIN_SOL_BALANCE) {
        return NextResponse.json(
          { error: `Insufficient SOL balance (${balance} SOL). Minimum required: ${MIN_SOL_BALANCE} SOL` },
          { status: 400 }
        )
      }

      // Start new interval
      const intervalMs = interval * 60 * 1000 // Convert minutes to milliseconds
      activeIntervals[botAddress] = setInterval(async () => {
        try {
          if (type === "pump") {
            await executePumpFunTrade(db, botAddress, tokenAddress)
          } else {
            await executeTrade(db, botAddress, tokenAddress)
          }
        } catch (error) {
          console.error("Auto trade interval failed:", error)
        }
      }, intervalMs)

      // Update bot status
      await db.collection("bots").updateOne(
        { address: botAddress },
        { 
          $set: { 
            autoTradeStatus: "active",
            autoTradeType: type || "normal",
            autoTradeInterval: interval,
            autoTradeToken: tokenAddress,
            autoTradeStarted: new Date()
          }
        }
      )

      return NextResponse.json({
        success: true,
        message: "Auto trading started",
        balance
      })
    } else if (action === "stop") {
      // Update bot status
      await db.collection("bots").updateOne(
        { address: botAddress },
        { 
          $set: { 
            autoTradeStatus: "stopped",
            autoTradeEnded: new Date()
          }
        }
      )

      return NextResponse.json({
        success: true,
        message: "Auto trading stopped"
      })
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Auto trade action failed:", error)
    return NextResponse.json(
      { error: "Failed to execute auto trade action" },
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
      { projection: { autoTradeStatus: 1, autoTradeType: 1, autoTradeInterval: 1, autoTradeToken: 1, autoTradeStarted: 1 } }
    )

    // Get current balance
    const balance = await checkBalance(botAddress)

    return NextResponse.json({
      success: true,
      autoTradeStatus: bot?.autoTradeStatus || "stopped",
      autoTradeType: bot?.autoTradeType,
      autoTradeInterval: bot?.autoTradeInterval,
      autoTradeToken: bot?.autoTradeToken,
      autoTradeStarted: bot?.autoTradeStarted,
      balance
    })
  } catch (error) {
    console.error("Failed to get auto trade status:", error)
    return NextResponse.json(
      { error: "Failed to get auto trade status" },
      { status: 500 }
    )
  }
}