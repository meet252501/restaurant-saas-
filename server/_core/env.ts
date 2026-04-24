export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET || "development_fallback_secret_do_not_use_in_production",
  databaseUrl: process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

/**
 * Validates critical environment variables for production readiness.
 * Kills the process if requirements are not met to prevent silent failures or security breaches.
 */
export function validateEnv() {
  const missing: string[] = [];
  
  if (!ENV.appId) missing.push("VITE_APP_ID");
  if (!ENV.oAuthServerUrl) missing.push("OAUTH_SERVER_URL");
  
  // Critical check for Production
  if (ENV.isProduction) {
    if (ENV.cookieSecret === "development_fallback_secret_do_not_use_in_production") {
      console.error("🚨 SECURITY ALERT: Using fallback JWT_SECRET in production! Please set JWT_SECRET in Render.");
      process.exit(1);
    }
    
    const dbUrl = process.env.TURSO_DATABASE_URL;
    if (!dbUrl || dbUrl.includes('your-db') || dbUrl === 'libsql://your-db-name.turso.io') {
      console.error("🚨 DATABASE ALERT: TURSO_DATABASE_URL is missing or using a placeholder in production.");
      process.exit(1);
    }
  }

  if (missing.length > 0) {
    console.warn(`[Env] Missing variables: ${missing.join(", ")}. Some features may be disabled.`);
  } else {
    console.log("[Env] Configuration validated successfully.");
  }
}