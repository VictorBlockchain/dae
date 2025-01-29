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
    if (daemon) {
      // Update the following address
      await botsCollection.updateOne(
        { user },
        { $set: { following: address } }
      );

      // Check if the copy address exists
      const daemon2 = await copyCollection.findOne({ address });
      if (!daemon2) {
        // Create a new copy entry if it doesn't exist
        const copy = {
          address,
          followers: [user]
        };
        await copyCollection.insertOne(copy);
      } else {
        // Add the user to the existing followers list
        await copyCollection.updateOne(
          { address },
          { $push: { followers: user } }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Copy address set. Next command: /copy on to start copying trades."
      });
    } else {
      return NextResponse.json({ success: false, message: "Activate your bot first." });
    }
    
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to set copy address" }, { status: 500 });
  }
}
