import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";

const connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");

export async function GET(req: Request) {
  try {
    const { address, tokenMintAddress } = await req.json();

    const userPublicKey = new PublicKey(address);
    const tokenMintPublicKey = new PublicKey(tokenMintAddress);
    const associatedTokenAccount = await getAssociatedTokenAddress(
      tokenMintPublicKey,
      userPublicKey
    );
    
    const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAccount);
    return NextResponse.json({ balance: tokenAccountInfo.value.amount });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch token balance" }, { status: 500 });
  }
}
