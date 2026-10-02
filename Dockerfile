FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# --ignore-scripts: no dependency gets to run code at install time.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server.js ./
COPY src ./src
COPY js ./js
COPY scripts ./scripts
COPY *.html *.css ./

USER node
EXPOSE 3000
CMD ["node", "server.js"]
