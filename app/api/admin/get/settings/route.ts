import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

async function isAdmin(user: string): Promise<boolean> {
    return user === process.env.ADMIN_SOLANA_ADDRESS
  }

  export async function GET(req: Request) {
    try {
      const { searchParams } = new URL(req.url)
      const user = searchParams.get("user")
      if (!user) {
        return NextResponse.json(
          { error: "Wallet address required" },
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
      
      const client = await clientPromise
      const db = client.db("daemon")
      const adminCollection = db.collection("admin");
      
      const admin = await adminCollection.findOne({ user });
      console.log(admin)
      return NextResponse.json({
        success: true,
        message: admin
      })
    } catch (error) {
      console.error("Failed to get settings:", error)
      return NextResponse.json(
        { error: "Failed to get settings" },
        { status: 500 }
      )
    }
  }
