import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { AutomationService } from "./automation";
import { initCloudDB } from "./tursoClient";
import { validateEnv } from "./env";

// Run validation immediately
validateEnv();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
});

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Commercial Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier integration with cross-domain dashboards for now
  }));
  app.use(limiter);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, bypass-tunnel-reminder",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const port = parseInt(process.env.PORT || "3000");

  // Setup WebSocket Server
  const wss = new WebSocketServer({ server });
  
  const handler = applyWSSHandler({
    wss,
    router: appRouter,
    createContext: async (opts) => {
      // Create context for WebSockets similar to Express
      return await createContext(opts as any);
    },
  });

  wss.on("connection", (ws: any) => {
    console.log(`➕➕ WS Connection (${wss.clients.size})`);
    ws.once("close", () => {
      console.log(`➖➖ WS Connection (${wss.clients.size})`);
    });
  });

  server.listen(port, "0.0.0.0", async () => {
    console.log(`[api] server and websocket listening on port ${port} on 0.0.0.0`);
    await initCloudDB();
    AutomationService.init();
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM");
    handler.broadcastReconnectNotification();
    wss.close();
  });
}

startServer().catch(console.error);
