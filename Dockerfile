FROM node:12.22.12 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --silent

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:12.22.1-slim

ENV NODE_ENV production

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY --chown=node:node --from=builder /app/dist /app

EXPOSE 3000

CMD [  "node", "server.js" ]

