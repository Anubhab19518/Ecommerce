# ---- Build Stage ----
FROM node:24-slim AS build

WORKDIR /app

# Install dependencies (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm install --ignore-scripts

# Copy source and build
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
RUN npm run build

# Prune devDependencies for production
RUN npm prune --omit=dev

# ---- Production Stage ----
FROM node:24-slim AS production

WORKDIR /app

# Security: run as non-root
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --shell /bin/false appuser

# Copy only production artifacts
COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/dist ./dist
COPY --from=build --chown=appuser:appgroup /app/package.json ./

# Copy migrations (needed at runtime for migration:run)
COPY --from=build --chown=appuser:appgroup /app/src/infrastructure/database/migrations ./dist/infrastructure/database/migrations

USER appuser

EXPOSE 8080

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health/live || exit 1

CMD ["node", "dist/index.js"]