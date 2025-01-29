// import { NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { Keypair } from "@solana/web3.js";

// export async function POST(req: Request) {
//   try {
//     // Get user, token, amount, type, and tradeType from the request body
//     const { user, token, amount, type, tradeType } = await req.json();

//     // Validate type and tradeType
//     if (![1, 2].includes(type)) {
//       return NextResponse.json({ success: false, message: "Invalid type. Type should be 1 (buy) or 2 (sell)" });
//     }

//     if (![1, 2, 3].includes(tradeType)) {
//       return NextResponse.json({ success: false, message: "Invalid trade type. Valid trade types are 1 (auto), 2 (copy), or 3 (manual)" });
//     }

//     // Connect to MongoDB to fetch bot details
//     const client = await clientPromise;
//     const db = client.db("daemon");
//     const botsCollection = db.collection("bots");

//     // Fetch bot information
//     const daemon = await botsCollection.findOne({ user });
//     if (!daemon) {
//       return NextResponse.json({ success: false, message: "Activate your bot first" });
//     }

//     // Get bot address
//     const botAddress = daemon.publicKey;

//     // Check if the bot has sufficient balance
//     const balance = await this.solanaManager.getBalance(botAddress);
//     if (balance < amount) {
//       return NextResponse.json({ success: false, message: "Insufficient balance" });
//     }

//     // Retrieve the bot's private key
//     let key = await this.solanaManager.getBotPrivateKey(botAddress);
//     const userWallet = Keypair.fromSecretKey(Uint8Array.from(key));

//     // Set up swap service
//     const swapService = new SwapService();

//     // Execute the swap using the SwapService
//     const result = await swapService.executeSwapPump(
//       userWallet,
//       token, // Token to swap
//       amount / 10 ** 9, // Amount in SOL (converted from lamports)
//       daemon.slippage, // Slippage (value from bot schema)
//       daemon.priority, // Priority (value from bot schema)
//       type // Trade type: 1 (buy) or 2 (sell)
//     );

//     // Return the response based on swap result
//     if (result) {
//       return NextResponse.json({ success: true, message: "Swap executed successfully" });
//     } else {
//       return NextResponse.json({ success: false, message: "Swap execution failed" });
//     }

//   } catch (error) {
//     console.error(error);
//     return NextResponse.json({ error: "Failed to execute swap" }, { status: 500 });
//   }
// }
