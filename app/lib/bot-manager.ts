import { DaeBot } from "./deepseek"
import { SolanaManager } from "./solana"

export class BotManager {
  private solanaManager: SolanaManager
  private activeBots: Map<string, DaeBot>
  private botNetworks: Map<string, Set<string>>

  constructor() {
    this.solanaManager = new SolanaManager()
    this.activeBots = new Map()
    this.botNetworks = new Map()
  }

  async createBot(name: string, user: string, initialDaeBalance: number = 0): Promise<DaeBot> {
    // Generate proper Solana address
    const address = this.solanaManager.generateBotAddress()
    
    // Create bot instance
    const bot = new DaeBot(address, name, initialDaeBalance)
    
    // Store in memory maps
    this.activeBots.set(address, bot)
    this.botNetworks.set(address, new Set())
    
    // Store bot in MongoDB
    try {
      const response = await fetch('/api/bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: user,
          address: bot.profile.address,
          name: bot.profile.name
        })
      })
  
      if (!response.ok) {
        throw new Error('Failed to store bot')
      }
  
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to store bot')
      }
  
    } catch (error) {
      console.error("Failed to store bot:", error)
      // Clean up memory maps since DB storage failed
      this.activeBots.delete(address)
      this.botNetworks.delete(address)
      throw error
    }
    
    return bot
  }
  
  async startTrading(botAddress: string, tokenAddress: string) {
    const bot = this.activeBots.get(botAddress)
    if (!bot) return

    bot.profile.activeToken = tokenAddress

    // Start trading loop
    this.runTradingLoop(bot)
  }

  private async runTradingLoop(bot: DaeBot) {
    const MIN_FOLLOWERS = 3
    const MAX_PERSUASION_ATTEMPTS = 5
    const TRADE_INTERVAL = 5 * 60 * 1000 // 5 minutes

    // Build follower network if needed
    while (bot.profile.followers.length < MIN_FOLLOWERS) {
      let attempts = 0
      for (const [address, targetBot] of this.activeBots) {
        if (attempts >= MAX_PERSUASION_ATTEMPTS) break
        if (address === bot.profile.address) continue
        if (bot.profile.followers.includes(address)) continue

        attempts++
        const daeOffer = Math.floor(bot.profile.daeBalance * 0.01) // Offer 1% of holdings
        const success = await bot.persuadeBot(targetBot, daeOffer)
        if (success) {
          console.log(`Bot ${bot.profile.name} persuaded ${targetBot.profile.name}`)
        }
      }
      if (attempts < MAX_PERSUASION_ATTEMPTS) break // No more bots to persuade
    }

    // Trading loop
    setInterval(async () => {
      if (!bot.profile.activeToken) return

      // Simulate trading decision (replace with actual strategy)
      const tradeType = Math.random() > 0.5 ? "buy" : "sell"
      const amount = Math.random() * 100

      // Execute trade with followers
      await bot.executeTrade(bot.profile.activeToken, tradeType, amount)
    }, TRADE_INTERVAL)
  }

  getBot(address: string): DaeBot | undefined {
    return this.activeBots.get(address)
  }

  async getBotBalance(address: string): Promise<number> {
    return this.solanaManager.getBalance(address)
  }
}