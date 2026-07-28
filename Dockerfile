# ============================================================
# Multi-stage Dockerfile for Fraud Checker BD Courier API
# ============================================================

# ── Stage 1: Install dependencies ───────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy package files first (better layer caching)
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# ── Stage 2: Build TypeScript ───────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# ── Stage 3: Production image ──────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

# Set NODE_ENV for production
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy built output from builder stage
COPY --from=builder /app/dist ./dist

# Copy package.json (needed for npm start)
COPY package.json ./

# Healthcheck — hit the /health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Run as non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

USER appuser

# Start the server
CMD ["node", "dist/index.js"]
