import { Keypair, PublicKey, Connection, Transaction, SystemProgram } from "@solana/web3.js"

export class SolanaManager {
  private connection: Connection

  constructor() {
    this.connection = new Connection(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com")
  }

  generateBotAddress(): string {
    const keypair = Keypair.generate()
    return keypair.publicKey.toString()
  }

  async getBalance(address: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address)
      const balance = await this.connection.getBalance(publicKey)
      return balance / 10 ** 9 // Convert lamports to SOL
    } catch (error) {
      console.error("Failed to get balance:", error)
      return 0
    }
  }

  async transferTokens(
    fromKeypair: Keypair,
    toAddress: string,
    amount: number
  ): Promise<boolean> {
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: new PublicKey(toAddress),
          lamports: amount * 10 ** 9
        })
      )

      const signature = await this.connection.sendTransaction(transaction, [fromKeypair])
      await this.connection.confirmTransaction(signature)
      return true
    } catch (error) {
      console.error("Transfer failed:", error)
      return false
    }
  }
}