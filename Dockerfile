# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine

# bcrypt requires native compilation on Alpine
RUN apk add --no-cache --virtual .build-deps python3 make g++

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force \
    && apk del .build-deps

COPY --from=builder /app/dist ./dist

# Run as non-root for security
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
