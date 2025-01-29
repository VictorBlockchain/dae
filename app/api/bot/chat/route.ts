// import { NextResponse } from "next/server"
// import clientPromise from "@/lib/mongodb"

// // Mock user ID for testing - in production this would be the user's Solana address
// const MOCK_USER_ID = "11111111111111111111111111111111"

// export async function GET(req: Request) {
//   try {
//     const { searchParams } = new URL(req.url)
//     const botAddress = searchParams.get("address")
//     const targetBot = searchParams.get("target")

//     if (!botAddress) {
//       return NextResponse.json(
//         { error: "Bot address required" },
//         { status: 400 }
//       )
//     }
    
//     const client = await clientPromise
//     const db = client.db("daemon")

//     // First verify the bot belongs to the mock user
//     const bot = await db.collection("bots").findOne({
//       address: botAddress,
//       owner_address: MOCK_USER_ID
//     })

//     if (!bot) {
//       return NextResponse.json(
//         { error: "Bot not found or unauthorized" },
//         { status: 404 }
//       )
//     }

//     // Build chat query
//     const query: any = {
//       $or: [
//         { initiator_address: botAddress },
//         { recipient_address: botAddress }
//       ]
//     }

//     if (targetBot) {
//       query.$or = [
//         { initiator_address: botAddress, recipient_address: targetBot },
//         { initiator_address: targetBot, recipient_address: botAddress }
//       ]
//     }

//     const chats = await db.collection("bot_chats")
//       .find(query)
//       .sort({ created_at: -1 })
//       .toArray()

//     return NextResponse.json({
//       success: true,
//       chats
//     })
//   } catch (error) {
//     console.error("Failed to get chat history:", error)
//     return NextResponse.json(
//       { error: "Failed to get chat history" },
//       { status: 500 }
//     )
//   }
// }

// export async function POST(req: Request) {
//   try {
//     const { initiatorAddress, recipientAddress, message } = await req.json()
    
//     const client = await clientPromise
//     const db = client.db("daemon")

//     // Verify the initiator bot belongs to the mock user
//     const bot = await db.collection("bots").findOne({
//       address: initiatorAddress,
//       owner_address: MOCK_USER_ID
//     })

//     if (!bot) {
//       return NextResponse.json(
//         { error: "Bot not found or unauthorized" },
//         { status: 404 }
//       )
//     }

//     const chat = await db.collection("bot_chats").insertOne({
//       initiator_address: initiatorAddress,
//       recipient_address: recipientAddress,
//       message,
//       created_at: new Date()
//     })

//     return NextResponse.json({
//       success: true,
//       chat
//     })
//   } catch (error) {
//     console.error("Failed to store chat:", error)
//     return NextResponse.json(
//       { error: "Failed to store chat" },
//       { status: 500 }
//     )
//   }
// }