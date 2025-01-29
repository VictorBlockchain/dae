// models/Bot.ts
import mongoose from "mongoose";

// Define the schema
const keywordSchema = new mongoose.Schema({
  user: String, // User ID or identifier
  keywords: [Object],
});

// Create the model
const Keywords = mongoose.model("Keywords", keywordSchema);

// Export the model
export default Keywords;