import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    // Get user and keyword from the request body
    const { user, word } = await req.json();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");
    const keywordsCollection = db.collection("keywords");

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (!daemon) {
      return NextResponse.json({ success: false, message: "Activate your bot first" });
    }

    // Find the keywords document by user
    const kwords = await keywordsCollection.findOne({ user });
    if (!kwords || !kwords.keywords.includes(word)) {
      return NextResponse.json({ success: false, message: "Keyword not found" });
    }

    // Remove the keyword
    kwords.keywords = kwords.keywords.filter((keyword: string) => keyword !== word);

    // Update the keywords document
    await keywordsCollection.updateOne(
      { user },
      { $set: { keywords: kwords.keywords } }
    );

    return NextResponse.json({ success: true, message: "Keyword removed successfully" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to remove keyword" }, { status: 500 });
  }
}
