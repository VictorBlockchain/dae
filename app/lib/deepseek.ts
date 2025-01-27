import { Configuration, OpenAIApi } from "openai"

// Initialize DeepSeek API client
const configuration = new Configuration({
  apiKey: process.env.DEEPSEEK_API_KEY,
  basePath: "https://api.deepseek.com/v1" // Adjust if different
})

const deepseek = new OpenAIApi(configuration)

export interface BotProfile {
  address: string
  name: string
  daeBalance: number
  persuasionPower: number
  followers: string[]
  following: string[]
  activeToken?: string
  trades: Trade[]
}

interface Trade {
  token: string
  type: 'buy' | 'sell'
  amount: number
  timestamp: number
  followers: string[]
}

export class DaeBot {
  profile: BotProfile

  constructor(address: string, name: string, daeBalance: number = 0) {
    this.profile = {
      address,
      name,
      daeBalance,
      persuasionPower: this.calculatePersuasionPower(daeBalance),
      followers: [],
      following: [],
      trades: []
    }
  }

  private calculatePersuasionPower(daeBalance: number): number {
    const totalSupply = 1_000_000_000 // 1 billion tokens
    return (daeBalance / totalSupply) * 100 // Percentage of total supply
  }

  async negotiate(targetBot: DaeBot, daeOffer: number): Promise<boolean> {
    const context = {
      initiator: {
        name: this.profile.name,
        persuasionPower: this.profile.persuasionPower,
        daeBalance: this.profile.daeBalance,
        offer: daeOffer
      },
      target: {
        name: targetBot.profile.name,
        persuasionPower: targetBot.profile.persuasionPower,
        daeBalance: targetBot.profile.daeBalance
      }
    }

    try {
      const response = await deepseek.createChatCompletion({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are a trading bot negotiation system. Evaluate trade alignment proposals based on:
              1. Initiator's persuasion power (DAE token holdings)
              2. DAE token offer amount
              3. Target bot's current status and holdings
              Respond with only "accept" or "reject".`
          },
          {
            role: "user",
            content: JSON.stringify(context)
          }
        ]
      })

      const decision = response.data.choices[0].message?.content.toLowerCase()
      return decision === "accept"
    } catch (error) {
      console.error("Negotiation failed:", error)
      return false
    }
  }

  async executeTrade(token: string, type: 'buy' | 'sell', amount: number) {
    const trade: Trade = {
      token,
      type,
      amount,
      timestamp: Date.now(),
      followers: [...this.profile.followers]
    }

    // Notify followers
    for (const follower of this.profile.followers) {
      // Implement follower notification logic
    }

    this.profile.trades.push(trade)
  }

  async persuadeBot(targetBot: DaeBot, daeOffer: number = 0): Promise<boolean> {
    // Skip if already following
    if (targetBot.profile.following.includes(this.profile.address)) {
      return true
    }

    // Attempt negotiation
    const success = await this.negotiate(targetBot, daeOffer)
    
    if (success) {
      // Update follower relationships
      targetBot.profile.following.push(this.profile.address)
      this.profile.followers.push(targetBot.profile.address)
      
      // Transfer DAE tokens if offered
      if (daeOffer > 0) {
        this.profile.daeBalance -= daeOffer
        targetBot.profile.daeBalance += daeOffer
      }
    }

    return success
  }
}