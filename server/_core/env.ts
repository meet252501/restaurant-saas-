export const ENV = {
  appId: process.env.VITE_APP_ID ?? "tablebook_pos",
  cookieSecret: process.env.JWT_SECRET || "development_fallback_secret_do_not_use_in_production",
  databaseUrl: process.env.DATABASE_URL ?? process.env.DATABASE_PATH ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

/**
 * Validates critical environment variables for production readiness.
 */
export function validateEnv() {
  const missing: string[] = [];
  
  if (!ENV.databaseUrl) missing.push("DATABASE_URL");
  
  if (missing.length > 0) {
    console.warn(`[Env] Missing variables: ${missing.join(", ")}. Server may not function correctly.`);
  }

  if (ENV.isProduction && ENV.cookieSecret === "development_fallback_secret_do_not_use_in_production") {
    console.warn("⚠️ Using fallback JWT_SECRET in production. Set JWT_SECRET for security.");
  }

  console.log("[Env] Configuration checked.");
}