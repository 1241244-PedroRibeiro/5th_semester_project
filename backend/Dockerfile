# Multi-stage build for optimized production footprint

# Stage 1: Build & Compilation
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install all dependencies including devDependencies for build time
RUN npm ci

# Copy all source files and tsconfig
COPY . .

# Compile TypeScript to JavaScript in dist/
RUN npm run build

# ----------------------------------------------------
# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy compiled dist folder from builder stage
COPY --from=builder /app/dist ./dist
COPY start-backend.sh ./start-backend.sh

# Seed item pictures; the laprizza-pictures volume is initialised from this folder on first creation.
COPY data/pictures ./data/pictures

# Expose internal application port
EXPOSE 3000

# Apply migrations and configured development seeds before running Node as PID 1.
CMD ["sh", "./start-backend.sh"]
