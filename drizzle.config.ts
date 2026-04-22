import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? path.resolve("./tablebook.db"),
  },
});
