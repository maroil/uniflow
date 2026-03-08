FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY dist/ ./dist/

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
USER node
CMD ["node", "dist/index.js"]
