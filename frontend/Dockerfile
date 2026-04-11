FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Recebe a URL da API em build-time (necessário para NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY . .
RUN npm run build

# ─── Runner ──────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

EXPOSE 3000

CMD ["node", "server.js"]
