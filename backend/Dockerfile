# API de Caminos Rurales SDE.
# Node 22 (Debian) porque bcrypt y better-sqlite3 son módulos nativos y en
# Alpine/musl no siempre hay binarios precompilados.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# better-sqlite3 (dependencia de @ngageoint/geopackage) y bcrypt son módulos
# nativos: si no hay binario precompilado para esta versión de Node, npm los
# compila con node-gyp.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM node:22-bookworm-slim AS runtime

# OpenSSL lo necesita Prisma y ca-certificates las conexiones TLS
# (Neon o Cloudinary).
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src

USER node

EXPOSE 3000

# Aplica las migraciones pendientes y arranca la API. `exec` permite que
# Docker envíe SIGTERM directamente a Node para el cierre ordenado.
CMD ["sh", "-c", "npx prisma migrate deploy && exec node src/server.js"]
