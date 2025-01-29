import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

async function isAdmin(user: string): Promise<boolean> {
    return user === process.env.ADMIN_SOLANA_ADDRESS
  }

export async function POST(req: Request) {
  try {
    // Get user and fee from the request body
    const { user, value } = await req.json()
    
    if (!user || !value) {
      return NextResponse.json(
        { error: "user and value required" },
        { status: 400 }
      )
    }
    
    // Verify admin
    if (!await isAdmin(user)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }
    
    const fee = parseFloat(value);
      
    // Allowable fee must be between 0 and 1
    if (isNaN(fee) || fee < 0 || fee > 1) {
        return NextResponse.json(
        { error: "Fee must be between 0 and 1 (e.g., 0.003 for 0.3%)" },
        { status: 400 }
        );
    }
    
    const client = await clientPromise
    const db = client.db("daemon")
    
    // Update setting
    const adminCollection = db.collection("admin");

    const daemon = await adminCollection.findOne({ user });
    if(daemon)  {
        await adminCollection.updateOne(
            { user },
            { 
            $set: { 
                fee: value,
                updatedAt: new Date(),
                updatedBy: user
            }
            }
        )
    }
    else {
        await adminCollection.insertOne(
            {
                user,
                fee: value,
                updatedAt: new Date(),
                updatedBy: user
            }
        )
    }
    return NextResponse.json({
      success: true,
      message: value
    })
  } catch (error) {
    console.error("Failed to update setting:", error)
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 }
    )
  }
}
