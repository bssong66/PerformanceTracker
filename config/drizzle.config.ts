import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const connectionString = process.env.DATABASE_URL!;

// Supabase always requires SSL
const dbCredentials = {
  url: connectionString,
  ssl: { rejectUnauthorized: false }
};

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials,
});
