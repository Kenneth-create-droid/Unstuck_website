FROM node:22-slim

WORKDIR /app

COPY backend/package*.json ./backend/
COPY keneca-engine/package*.json ./keneca-engine/

RUN cd backend && npm ci
RUN cd keneca-engine && npm ci

COPY backend ./backend
COPY keneca-engine ./keneca-engine

WORKDIR /app/backend

ENV NODE_ENV=production

CMD ["node", "server.js"]
