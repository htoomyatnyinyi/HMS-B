# Multi-stage Bun Dockerfile for Healthcare API Monolith
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS dependencies
COPY package.json bun.lock ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN bun install --frozen-lockfile

# Generate Prisma Client
RUN bun x prisma generate

# Runner stage
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy node_modules, generated prisma client, and source code
COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

# Expose API Port
EXPOSE 3000

# Start server
CMD ["bun", "run", "src/index.ts"]
