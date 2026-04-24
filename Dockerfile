FROM node:20-slim AS base

# Install dependencies for sqlite/native modules if needed
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy the rest of the application
COPY . .

# Build the server
RUN npm run build

# Production image
FROM node:20-slim AS runner
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server ./server
COPY --from=base /app/drizzle ./drizzle
COPY --from=base /app/drizzle.config.ts ./drizzle.config.ts

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Run the server
CMD ["node", "dist/index.mjs"]
