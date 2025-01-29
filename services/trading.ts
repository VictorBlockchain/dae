// services/tradingBotService.ts

import  Bot  from "@/lib/models/bot"; // Assuming you have the Bot model defined
import { SolanaManager } from "@/lib/solana"; // Assuming you have a Solana manager

class TradingBotService {
  private solanaManager: SolanaManager;
  private intervals: Map<string, NodeJS.Timeout>;
  
  constructor() {
    this.solanaManager = new SolanaManager();
    this.intervals = new Map();
  }
  
  // Start auto trading for the user
  async autoTradeStart(user: string): Promise<any> {
    const daemon: any = await Bot.findOne({ user });
    if (!daemon) {
      return { success: false, message: "Bot not found" };
    }

    if (daemon.status < 1) {
      return { success: false, message: "Start your bot first" };
    }

    // Prevent multiple intervals for the same user
    if (this.intervals.has(user)) {
      return { success: false, message: "Auto trade already running for this user" };
    }

    daemon.autobuy = true;
    await daemon.save();

    const time = daemon.autoBuyTime / 60; // Time in minutes
    const intervalId = setInterval(() => {
      this.autoTrade(user);
    }, time * 60 * 1000); // Convert minutes to milliseconds

    this.intervals.set(user, intervalId); // Save the interval
    return { success: true, message: "Auto trade started" };
  }

  // Perform the auto trade action
  private async autoTrade(user: string) {
    const daemon: any = await Bot.findOne({ user });
    if (daemon.autoBuy) {
      let botAddress: any = daemon.publicKey;
      const balanceSol = await this.solanaManager.getBalance(botAddress);

      // If SOL balance is too low, sell some coins
      if (balanceSol < daemon.autoBuyAmount) {
        let trades = daemon.tradesAuto;
        for (let i = 0; i < trades.length; i++) {
          const element: any = trades[i];
          if (element.amount > 0) {
            const balanceToken = await this.solanaManager.getTokenBalance(element.address, element.token);
            if (balanceToken > 0) {
              let result: any = await this.sellRaydium(user, element.token, balanceToken, 2);
              if (result.success) {
                element.amount = 0;
                await daemon.save();
              }
            } else {
              element.amount = 0;
              await daemon.save();
            }
          }
        }
      } else {
        // If SOL balance is good, buy some coins
        let buyAmount = daemon.autoBuyAmount;
        let token = daemon.token;
        let result: any = await this.buyRaydium(user, token, buyAmount, 2);
      }
    }
  }

  // Example function for buying Raydium
  private async buyRaydium(user: string, token: string, amount: number, tradeType: number): Promise<any> {
    // Implement buy logic here (you would likely use an API for Raydium swap)
    return { success: true, message: "Buy executed successfully" };
  }

  // Example function for selling Raydium
  private async sellRaydium(user: string, token: string, amount: number, tradeType: number): Promise<any> {
    // Implement sell logic here (you would likely use an API for Raydium swap)
    return { success: true, message: "Sell executed successfully" };
  }
}

export default TradingBotService;
