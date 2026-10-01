# ==============================================================================
# DOCKERFILE - BACKEND API NODE.JS (GPS GEOMARKETING ANGOLA 2027)
# ==============================================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Imagem de Produção Leve
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src

EXPOSE 3001

USER node

CMD ["node", "src/server.js"]
