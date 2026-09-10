# Multi-stage production Dockerfile for Personal AI Assistant Backend on Cloud Run
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy full source
COPY . .

# Compile Vite frontend and Express CommonJS bundle
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose application port
EXPOSE 3000

# Start compiled server
CMD ["node", "dist/server.cjs"]
