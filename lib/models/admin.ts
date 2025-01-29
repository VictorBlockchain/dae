// models/Bot.ts
import { Fee } from "@raydium-io/raydium-sdk";
import mongoose from "mongoose";

// Define the schema
const adminSchema = new mongoose.Schema({
  user: String, // User ID or identifier
  fee: Number, // Fee to be charged
  feeAddress: String, // Fee object
  active: Boolean, // admin activation status
  updatedAt: Number, // Last updated timestamp
  updatedBy: String // User ID or identifier
});

// Create the model
const Admin = mongoose.model("admin", adminSchema);

// Export the model
export default Admin;