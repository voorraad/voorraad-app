FROM node:20-alpine
ENV NODE_ENV=production TZ=Europe/Brussels
RUN apk add --no-cache tzdata
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.js status.js ./
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://127.0.0.1:8080/gezond || exit 1
CMD ["node", "index.js"]
