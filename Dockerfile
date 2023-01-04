FROM node:16.17.1-alpine3.16 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --silent

COPY . .

RUN npx prisma generate

RUN npm run build

FROM node:16.17.1-alpine3.16

ENV NODE_ENV production

WORKDIR /app

COPY --chown=node:node --from=builder /app/dist /app
COPY --chown=node:node --from=builder /app/node_modules /app/node_modules
COPY --chown=node:node --from=builder /app/prisma /app/prisma
COPY --chown=node:node --from=builder /app//src/utils/email_templates/ /app/utils/email_templates/
EXPOSE 3000

CMD [  "node", "server.js" ]

