import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function POST(req: Request) {
  try {
    const { word } = await req.json()
    
    if (!word) {
      return NextResponse.json(
        { error: "Word required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    // Add word to listing words collection
    await db.collection("listing_words").insertOne({
      word: word.toLowerCase(),
      created_at: new Date()
    })

    return NextResponse.json({
      success: true,
      word
    })
  } catch (error) {
    console.error("Failed to add listing word:", error)
    return NextResponse.json(
      { error: "Failed to add listing word" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db("daemon")

    const words = await db.collection("listing_words")
      .find()
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      words: words.map(w => w.word)
    })
  } catch (error) {
    console.error("Failed to get listing words:", error)
    return NextResponse.json(
      { error: "Failed to get listing words" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { word } = await req.json()
    
    if (!word) {
      return NextResponse.json(
        { error: "Word required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db("daemon")

    await db.collection("listing_words").deleteOne({
      word: word.toLowerCase()
    })

    return NextResponse.json({
      success: true,
      word
    })
  } catch (error) {
    console.error("Failed to delete listing word:", error)
    return NextResponse.json(
      { error: "Failed to delete listing word" },
      { status: 500 }
    )
  }
}