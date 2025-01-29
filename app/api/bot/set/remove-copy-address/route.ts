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
    const copyCollection = db.collection("copy");

    // Find the bot by user
    const daemon = await botsCollection.findOne({ user });
    if (!daemon) {
      return NextResponse.json({ success: false, message: "Activate your bot first" });
    }

    // Find the Copy document by address
    const copy = await copyCollection.findOne({ address });
    if (!copy) {
      return NextResponse.json({ success: false, message: "Address not found in Copy schema" });
    }

    // Check if the user is in the followers array
    if (!copy.followers.includes(user)) {
      return NextResponse.json({ success: false, message: "User not found in followers list" });
    }

    // Remove the user from the followers array
    await copyCollection.updateOne(
      { address },
      { $pull: { followers: user } }
    );

    // Clear the following address in the Bot schema
    await botsCollection.updateOne(
      { user },
      { $set: { following: null } }
    );

    return NextResponse.json({ success: true, message: "No longer copying trades of that address" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to remove copy address" }, { status: 500 });
  }
}
