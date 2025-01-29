import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    // Get user and slippage from the request body
    const { user, slippage } = await req.json();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (daemon) {
      // Update the slippage
      await botsCollection.updateOne(
        { user },
        { $set: { slippage } }
      );
      return NextResponse.json({
        success: true,
        message: "Slippage set. Next command: /priority to set trade priority or /start to auto trade or /buy to manual buy."
      });
    } else {
      return NextResponse.json({ success: false, message: "Activate your bot first." });
    }

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set slippage" }, { status: 500 });
  }
}
