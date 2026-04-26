import { defineConfig } from "drizzle-kit";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const dbUrl = process.env.DATABASE_URL;
const isPostgres = dbUrl?.startsWith("postgres");

export default defineConfig({
  schema: isPostgres ? "./drizzle/schema.postgres.ts" : "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: {
    url: isPostgres ? (dbUrl as string) : (process.env.DATABASE_PATH ?? path.resolve("./tablebook.db")),
  },
});
