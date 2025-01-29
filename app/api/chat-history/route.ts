import { NextResponse } from "next/server"
import clientPromise from "../../lib/mongodb"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("daemon")

    const chatHistory = await db.collection("chatHistory").find({}).toArray()

    return NextResponse.json(chatHistory.map((msg) => msg.content))
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 })
  }
}

