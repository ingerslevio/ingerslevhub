# Stage 1: Build web frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY src/web/package*.json ./
RUN npm ci
COPY src/web/ ./
RUN npm run build

# Stage 2: Build API
FROM node:20-alpine AS api-builder
WORKDIR /app/api
COPY src/api/package*.json ./
RUN npm ci --omit=dev
COPY src/api/ ./
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=api-builder /app/api/dist ./dist
COPY --from=api-builder /app/api/node_modules ./node_modules
COPY --from=web-builder /app/web/dist ./public
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
