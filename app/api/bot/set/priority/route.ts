import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    // Get user and priority from the request body
    const { user, priority } = await req.json();

    // Connect to the database
    const client = await clientPromise;
    const db = client.db("daemon");
    const botsCollection = db.collection("bots");

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (daemon) {
      // Update the priority
      await botsCollection.updateOne(
        { user },
        { $set: { priority } }
      );
      return NextResponse.json({
        success: true,
        message: "Priority set. Next command: /start to auto trade or /buy to manual buy."
      });
    } else {
      return NextResponse.json({ success: false, message: "Activate your bot first." });
    }

  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set priority" }, { status: 500 });
  }
}
