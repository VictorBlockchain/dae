// pages/api/trade/auto-start.ts

import clientPromise from "@/lib/mongodb"; // MongoDB client
import { NextApiRequest, NextApiResponse } from "next";
import TradingBotService from "@/services/trading"; // Assume this is the class with autoTradeStart method

const tradingBotService = new TradingBotService(); // Instantiate the service

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { user } = req.body; // Expect the 'user' parameter to be passed in the request body

      if (!user) {
        return res.status(400).json({ success: false, message: "User is required" });
      }

      // Call the autoTradeStart method to start the auto trading process
      const result = await tradingBotService.autoTradeStart(user);
      
      return res.status(200).json(result); // Return the response from autoTradeStart
    } catch (error) {
      console.error("Error in /api/trade/auto-start:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  } else {
    // Return error if the method is not POST
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }
}
