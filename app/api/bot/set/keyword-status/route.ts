import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    // Get user and status from the request body
    const { user, status } = await req.json();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");

    // Check if status is valid
    let statusValue = 0;
    if (status === 'on') {
      statusValue = 1;
    } else if (status === 'off') {
      statusValue = 0;
    } else {
      return NextResponse.json({ success: false, message: "Status should be 'on' or 'off'" });
    }

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (!daemon) {
      return NextResponse.json({ success: false, message: "Activate your bot first" });
    }

    // Update the keywordTrades status
    daemon.keywordTrades = statusValue;

    // Save the updated bot document
    await botsCollection.updateOne(
      { user },
      { $set: { keywordTrades: statusValue } }
    );

    return NextResponse.json({ success: true, message: "Keyword trade status updated" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update keyword trade status" }, { status: 500 });
  }
}
