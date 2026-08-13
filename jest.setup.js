/**
 * Jest Setup File
 * Load environment variables before tests run
 */
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local for test configuration
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Also load .env as fallback
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("[Jest Setup] Environment loaded");
console.log("[Jest Setup] MONGODB_URI:", process.env.MONGODB_URI ? "(set)" : "(not set)");
