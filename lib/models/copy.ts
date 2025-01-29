// models/Bot.ts
import mongoose from "mongoose";

// Define the schema
const copySchema = new mongoose.Schema({
  address: String, // User ID or identifier
  followers: [Object],
});

// Create the model
const Copy = mongoose.model("copy", copySchema);

// Export the model
export default Copy;