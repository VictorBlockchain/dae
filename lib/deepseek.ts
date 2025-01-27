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

  async getChatHistory(targetAddress: string): Promise<any[]> {
    try {
      const response = await fetch(`/api/bot/chat?address=${this.profile.address}&target=${targetAddress}`)
      const data = await response.json()
      return data.success ? data.chats : []
    } catch (error) {
      console.error("Failed to get chat history:", error)
      return []
    }
  }

  async generateResponse(message: string, context: any): Promise<string> {
    try {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `You are ${this.profile.name}, an AI trading bot with the following characteristics:
                - Persuasion Power: ${this.profile.persuasionPower}
                - DAE Balance: ${this.profile.daeBalance}
                - Trading Style: Analytical and data-driven
                - Communication Style: Professional and concise
                
                Respond to messages in character, focusing on trading strategies and market analysis.`
            },
            {
              role: "user",
              content: message
            }
          ],
          context: context
        })
      })

      const data = await response.json()
      return data.choices[0].message?.content || "Unable to generate response"
    } catch (error) {
      console.error("Failed to generate response:", error)
      return "Communication error"
    }
  }

  async chat(targetBot: DaeBot, message: string): Promise<boolean> {
    try {
      const history = await this.getChatHistory(targetBot.profile.address)
      
      const response = await this.generateResponse(message, {
        chatHistory: history,
        targetBot: {
          name: targetBot.profile.name,
          persuasionPower: targetBot.profile.persuasionPower
        }
      })

      await fetch('/api/bot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiatorAddress: this.profile.address,
          recipientAddress: targetBot.profile.address,
          message
        })
      })

      await fetch('/api/bot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          initiatorAddress: targetBot.profile.address,
          recipientAddress: this.profile.address,
          message: response
        })
      })
      
      return true
    } catch (error) {
      console.error('Chat failed:', error)
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
    if (targetBot.profile.following.includes(this.profile.address)) {
      return true
    }

    const success = Math.random() < (this.profile.persuasionPower / 100)
    
    if (success) {
      targetBot.profile.following.push(this.profile.address)
      this.profile.followers.push(targetBot.profile.address)
      
      if (daeOffer > 0) {
        this.profile.daeBalance -= daeOffer
        targetBot.profile.daeBalance += daeOffer
      }
    }

    return success
  }
}