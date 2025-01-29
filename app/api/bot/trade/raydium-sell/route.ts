// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { Keypair } from "@solana/web3.js";
// import SwapService from "@/lib/swapService";  // Assuming SwapService is correctly imported from your project

// export async function POST(req: Request) {
//   try {
//     // Get the user, token, amount, and tradeType from the request body
//     const { user, token, amount, tradeType } = await req.json();

//     // Validate tradeType (1 = auto, 2 = copy, 3 = manual)
//     if (![1, 2, 3].includes(tradeType)) {
//       return NextResponse.json({ success: false, message: "Invalid trade type. Valid types are 1 (auto), 2 (copy), or 3 (manual)." });
//     }

//     // Connect to the MongoDB database
//     const client = await clientPromise;
//     const db = client.db("daemon");
//     const botsCollection = db.collection("bots");

//     // Fetch bot address from the database
//     const daemon = await botsCollection.findOne({ user });
//     if (!daemon) {
//       return NextResponse.json({ success: false, message: "Activate your bot first" });
//     }

//     const botAddress = daemon.publicKey;

//     // Check bot token balance
//     const balance = await this.solanaManager.getTokenBalance(botAddress, token);
//     if (balance < amount) {
//       return NextResponse.json({ success: false, message: "Insufficient balance" });
//     }

//     // Retrieve the private key to create a user wallet
//     let key = await this.solanaManager.getBotPrivateKey(botAddress);
//     const userWallet = Keypair.fromSecretKey(Uint8Array.from(key));

//     // Set up the swap service
//     const swapService = new SwapService();

//     // Execute the swap
//     const result = await swapService.executeSwap(
//       userWallet,
//       token, // The token to swap from
//       "So11111111111111111111111111111111111111112", // SOL
//       amount / 10 ** 9, // Amount in SOL (converted from lamports)
//       0.01 // Slippage (1%)
//     );

//     // Check if the swap was successful
//     if (result) {
//       return NextResponse.json({ success: true, message: "Sell executed successfully" });
//     } else {
//       return NextResponse.json({ success: false, message: "Swap execution failed" });
//     }
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: "Failed to execute sell" }, { status: 500 });
//   }
// }
