FROM node:22.23.3-bookworm-slim

# The base image supplies Node and npm; this dependency-free app needs no system packages.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --offline --no-audit --no-fund

COPY server.js ./
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY scenarios/ ./scenarios/
COPY test/ ./test/
COPY LICENSE ./
RUN npm run verify

ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["node", "--input-type=module", "-e", "try { const response = await fetch('http://127.0.0.1:' + process.env.PORT + '/', { signal: AbortSignal.timeout(4000) }); process.exit(response.ok ? 0 : 1); } catch { process.exit(1); }"]
CMD ["node", "server.js"]
