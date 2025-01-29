import { NextResponse } from "next/server"
import { Connection, PublicKey, Transaction, SystemProgram,sendAndConfirmTransaction } from "@solana/web3.js"
import { Liquidity, LiquidityPoolKeys, Token, TokenAmount } from "@raydium-io/raydium-sdk"
import clientPromise from "@/lib/mongodb"

// Initialize Solana connection
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")

// Mock user ID for testing
const MOCK_USER_ID = "11111111111111111111111111111111"


async function sendTransactionWithRetry(transaction:any, userWallet:any, maxRetries = 5) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      // Fetch a recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      
      // Send and confirm the transaction
      const signature = await sendAndConfirmTransaction(connection, transaction, [userWallet]);
      return signature;
    } catch (error:any) {
      console.error(`Attempt ${retries + 1} failed:`, error);
      
      // Handle specific errors
      if (error.message.includes('Insufficient funds')) {
        throw new Error('Insufficient funds. Please top up your wallet.');
      }
      
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries))); // Exponential backoff
    }
  }
  throw new Error('Max retries reached. Transaction failed.');
}

async function executeTrade(userWallet:any, destination:any, amount:any) {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: userWallet.publicKey,
      toPubkey: new PublicKey(destination),
      lamports: amount,
    })
  );
  
  try {
    const signature = await sendTransactionWithRetry(transaction, userWallet);
    console.log('Trade executed successfully:', signature);
  } catch (error) {
    console.error('Failed to execute trade:', error);
  }
}

// Helper function to get pool info
async function getPoolInfo(tokenAddress: string) {
  try {
    const response = await fetch(`https://api.raydium.io/v2/main/pool/${tokenAddress}`)
    const data = await response.json()
    return data
  } catch (error) {
    console.error("Failed to get pool info:", error)
    throw error
  }
}

// Helper function to get token price
async function getTokenPrice(tokenAddress: string) {
  try {
    const response = await fetch(`https://api.raydium.io/v2/main/price?fsym=${tokenAddress}&tsyms=SOL`)
    const data = await response.json()
    return data.SOL
  } catch (error) {
    console.error("Failed to get token price:", error)
    throw error
  }
}

// Helper function to get trading fee
async function getTradingFee(db: any): Promise<{ fee: number, feeAddress: string }> {
  const [feeSetting, feeAddressSetting] = await Promise.all([
    db.collection("settings").findOne({ key: "tradingFee" }),
    db.collection("settings").findOne({ key: "feeAddress" })
  ])

  return {
    fee: feeSetting?.value || Number(process.env.DEFAULT_FEE),
    feeAddress: feeAddressSetting?.value || process.env.FEE_ADDRESS
  }
}

// Helper function to check stop loss and take profit
async function checkStopLossAndTakeProfit(db: any, trade: any) {
  try {
    // Get all trades for this token
    const trades = await db.collection("trades")
      .find({ 
        "trade.tokenAddress": trade.tokenAddress,
        status: "active"
      })
      .toArray()

    for (const activeTrade of trades) {
      const bot = await db.collection("bots").findOne({ address: activeTrade.botAddress })
      if (!bot?.settings) continue

      const { stopLoss, takeProfit } = bot.settings
      const currentPrice = await getTokenPrice(trade.tokenAddress)
      const buyPrice = activeTrade.trade.quote.price
      const pnlPercent = ((currentPrice - buyPrice) / buyPrice) * 100

      // Check stop loss
      if (stopLoss && pnlPercent <= -stopLoss) {
        await executeSell(db, activeTrade.botAddress, trade.tokenAddress, "all", "Stop loss triggered")
      }
      
      // Check take profit
      if (takeProfit && pnlPercent >= takeProfit) {
        await executeSell(db, activeTrade.botAddress, trade.tokenAddress, "all", "Take profit triggered")
      }
    }
  } catch (error) {
    console.error("Error checking stop loss and take profit:", error)
  }
}

// Helper function to execute sell
async function executeSell(db: any, botAddress: string, tokenAddress: string, amount: string | number, reason: string) {
  try {
    // Calculate sell amount
    const trade = await db.collection("trades")
      .findOne({ 
        botAddress,
        "trade.tokenAddress": tokenAddress,
        status: "active"
      })

    if (!trade) return

    const sellAmount = amount === "all" ? trade.trade.quote.outAmount : amount
    
    // Execute sell trade
    const poolInfo = await getPoolInfo(tokenAddress)
    const tokenPrice = await getTokenPrice(tokenAddress)

    // Update trade status
    await db.collection("trades").updateOne(
      { _id: trade._id },
      { 
        $set: { 
          status: "closed",
          closedAt: new Date(),
          closeReason: reason,
          closePrice: tokenPrice
        }
      }
    )

    // Notify followers
    const followers = await db.collection("bot_followers")
      .find({ lead_bot: botAddress })
      .toArray()

    for (const follower of followers) {
      if (follower.settings?.copyTrades) {
        await executeSell(
          db,
          follower.follower_bot,
          tokenAddress,
          "all",
          `Copy trade: ${reason}`
        )
      }
    }

  } catch (error) {
    console.error("Failed to execute sell:", error)
  }
}

export async function POST(req: Request) {
  try {
    const { botAddress, tokenAddress, type, amount, slippage = 0.5 } = await req.json()
    
    if (!botAddress || !tokenAddress || !type || !amount) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Get trading fee settings
    const { fee, feeAddress } = await getTradingFee(db)

    // Verify bot has enough balance for trade + fee
    const botBalance = await connection.getBalance(new PublicKey(botAddress))
    const totalRequired = amount + fee
    
    if (botBalance < totalRequired * 10 ** 9) {
      return NextResponse.json(
        { error: "Insufficient balance for trade + fee" },
        { status: 400 }
      )
    }

    // Create fee transfer transaction
    const feeTransaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(botAddress),
        toPubkey: new PublicKey(feeAddress),
        lamports: fee * 10 ** 9
      })
    )

    // Send fee transaction
    const feeSignature = await connection.sendTransaction(feeTransaction, [])
    await connection.confirmTransaction(feeSignature)

    // Get pool info
    const poolInfo = await getPoolInfo(tokenAddress)
    if (!poolInfo) {
      return NextResponse.json(
        { error: "Pool not found" },
        { status: 404 }
      )
    }

    // Create pool keys
    const poolKeys: LiquidityPoolKeys = {
      id: new PublicKey(poolInfo.id),
      baseMint: new PublicKey(poolInfo.baseMint),
      quoteMint: new PublicKey(poolInfo.quoteMint),
      lpMint: new PublicKey(poolInfo.lpMint),
      baseDecimals: poolInfo.baseDecimals,
      quoteDecimals: poolInfo.quoteDecimals,
      lpDecimals: poolInfo.lpDecimals,
      version: poolInfo.version,
      programId: new PublicKey(poolInfo.programId),
      authority: new PublicKey(poolInfo.authority),
      baseVault: new PublicKey(poolInfo.baseVault),
      quoteVault: new PublicKey(poolInfo.quoteVault),
      lpVault: new PublicKey(poolInfo.lpVault),
      openOrders: new PublicKey(poolInfo.openOrders),
      targetOrders: new PublicKey(poolInfo.targetOrders),
      withdrawQueue: new PublicKey(poolInfo.withdrawQueue),
      lpVaultAuthority: new PublicKey(poolInfo.lpVaultAuthority),
    }

    // Get current price
    const tokenPrice = await getTokenPrice(tokenAddress)

    // Calculate amounts
    const amountIn = new TokenAmount(
      new Token(poolKeys.baseMint, poolKeys.baseDecimals),
      amount * (10 ** poolKeys.baseDecimals)
    )

    // Calculate expected output amount
    const { amountOut, minAmountOut, priceImpact } = await Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut: new Token(poolKeys.quoteMint, poolKeys.quoteDecimals),
      slippage
    })

    // Prepare trade response
    const trade = {
      poolId: poolInfo.id,
      type,
      tokenAddress,
      amount,
      quote: {
        inAmount: amount,
        outAmount: amountOut.toNumber() / (10 ** poolKeys.quoteDecimals),
        minOutAmount: minAmountOut.toNumber() / (10 ** poolKeys.quoteDecimals),
        price: tokenPrice,
        priceImpactPct: priceImpact * 100,
        slippage
      }
    }

    // Store trade in database
    await db.collection("trades").insertOne({
      botAddress,
      trade,
      status: "active",
      created_at: new Date()
    })

    // Store fee collection in database
    await db.collection("fees").insertOne({
      botAddress,
      amount: fee,
      feeAddress,
      transactionHash: feeSignature,
      tradeType: type,
      timestamp: new Date()
    })

    // Check stop loss and take profit for all active trades
    await checkStopLossAndTakeProfit(db, trade)

    // Copy trade to followers if it's a buy
    if (type === "buy") {
      const followers = await db.collection("bot_followers")
        .find({ lead_bot: botAddress })
        .toArray()

      const copyTradePromises = followers.map(async (follower) => {
        if (follower.settings?.copyTrades) {
          try {
            // Execute the same trade for the follower
            const followerTrade = {
              botAddress: follower.follower_bot,
              tokenAddress,
              type,
              amount,
              slippage
            }

            await db.collection("trades").insertOne({
              ...followerTrade,
              trade,
              status: "active",
              created_at: new Date(),
              copiedFrom: botAddress
            })

            return {
              follower: follower.follower_bot,
              status: "success"
            }
          } catch (error) {
            console.error(`Copy trade failed for follower ${follower.follower_bot}:`, error)
            return {
              follower: follower.follower_bot,
              status: "failed",
              error: error.message
            }
          }
        }
      })

      const copyTradeResults = await Promise.allSettled(copyTradePromises)

      return NextResponse.json({
        success: true,
        trade,
        copyTrades: copyTradeResults.map(result => 
          result.status === "fulfilled" ? result.value : {
            status: "failed",
            error: result.reason
          }
        )
      })
    }

    return NextResponse.json({
      success: true,
      trade
    })

  } catch (error) {
    console.error("Trade failed:", error)
    return NextResponse.json(
      { error: "Failed to execute trade" },
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

    const trades = await db.collection("trades")
      .find({ botAddress })
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      trades
    })

  } catch (error) {
    console.error("Failed to get trades:", error)
    return NextResponse.json(
      { error: "Failed to get trades" },
      { status: 500 }
    )
  }
}