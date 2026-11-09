# ========================================================================
# Hotel Booking Backend - Dockerfile
# ========================================================================
# Build context must be repo root (hotel-booking-system/) to include shared/
# In Coolify: Base Directory = . (root), Dockerfile = backend/Dockerfile
# ========================================================================

# Stage 1: Builder (install deps + compile TypeScript)
FROM node:20-alpine AS builder
WORKDIR /app
# Copy backend + shared (backend imports from ../../../shared)
COPY backend/package*.json ./backend/
COPY shared ./shared
RUN cd backend && npm ci
COPY backend ./backend
RUN cd backend && npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/shared ./shared

WORKDIR /app/backend

# App uses process.env.PORT || 5001. In Coolify set PORT=3000 and Ports Mappings 5001:3000.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5001) + '/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "dist/backend/src/server.js"]
