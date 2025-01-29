// models/Bot.ts
import mongoose from "mongoose";

// Define the schema
const botSchema = new mongoose.Schema({
  user: String, // User ID or identifier
  botname: String, // Name of the bot
  botid: Number, // Unique bot ID (you may want to auto-generate this)
  publicKey: String, // Solana public key
  encryptedPrivateKey: String, // Encrypted private key
  iv: String, // Initialization vector for decryption
  power: Number, // Bot power level
  followers: [String], // List of follower bot IDs
  following: String, // List of followed bot IDs
  token: String, // Associated token (if any)
  tradesAuto: [Object], // List of trades executed by the bot
  tradesCopy: [Object], // List of trades executed by the bot
  tradesManual: [Object], // List of trades executed by the bot
  statusTrades: Number, // Status of the bot (e.g.,1  active, 0 inactive)
  statusCopy:Number,
  slippage: Number,
  priority: Number,
  autoBuy: Boolean,
  autoBuyAmount: Number,
  autoBuyTime: Number,
  keywordTrades:Number
});

// Create the model
const Bot = mongoose.model("Bot", botSchema);

// Export the model
export default Bot;