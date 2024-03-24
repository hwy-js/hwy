# Install and Build Stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public/dist ./public/dist
COPY --from=builder /app/markdown ./markdown
COPY --from=builder /app/package.json ./package.json
CMD ["node", "dist/main.js"]
