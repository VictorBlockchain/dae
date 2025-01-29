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

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (!daemon) {
      return NextResponse.json({ success: false, message: "Activate your bot first" });
    }

    // Set copy status
    if (status === 1) {
      daemon.statusCopy = 1;
    } else {
      daemon.statusCopy = 0;
    }

    // Update the bot document with the new status
    await botsCollection.updateOne(
      { user },
      { $set: { statusCopy: daemon.statusCopy } }
    );

    return NextResponse.json({ success: true, message: "Copy status updated" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to update copy status" }, { status: 500 });
  }
}
