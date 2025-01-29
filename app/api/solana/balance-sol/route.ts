import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js"
const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")

export async function GET(req: Request) {
  try {
    const { address } = await req.json()
    
    const publicKey = new PublicKey(address)
    const balance = await connection.getBalance(publicKey)
    return balance / 10 ** 9 // Convert lamports to SOL
  
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
  }
}

