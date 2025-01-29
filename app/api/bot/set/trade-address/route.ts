import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    // Get user and address from the request body
    const { user, address } = await req.json();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (daemon) {
      // Update the token (trade address)
      await botsCollection.updateOne(
        { user },
        { $set: { token: address } }
      );
      return NextResponse.json({ success: true, message: "Trade address set, next use /slippage to set trade slippage" });
    } else {
      return NextResponse.json({ success: false, message: "Activate your bot first" });
    }

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set trade address" }, { status: 500 });
  }
}
