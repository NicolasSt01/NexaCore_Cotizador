FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Dependencies (full, for building)
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DOCKER_BUILD=true
# Placeholder: ni `prisma generate` ni `next build` se conectan a la BD, pero la
# config de Prisma exige que la variable exista. La real la inyecta Dokploy en runtime.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
RUN npx prisma generate --config prisma.config.ts && npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV npm_config_cache=/tmp/.npm

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Dependencias de producción + CLI de Prisma y tsx: se necesitan para correr las
# migraciones y el seed al arrancar el contenedor.
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm install --no-save --no-audit --no-fund prisma tsx \
 && npm cache clean --force

COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/generated ./src/generated

# El servidor standalone no incluye public/ ni .next/static: hay que copiarlos aparte.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

COPY --chown=nextjs:nodejs entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/entrypoint.sh"]
