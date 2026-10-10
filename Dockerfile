FROM node:22-trixie-slim

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY --chown=node:node app/package*.json ./

RUN npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --chown=node:node app/ ./

USER node

EXPOSE 3000

CMD ["node", "server.js"]
