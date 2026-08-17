# Streamr frontend — Next.js, built and served in production mode.
# Multi-stage: install deps, build, then a slim runtime image.

FROM node:22-alpine AS deps
WORKDIR /app
# Same reason as the backend's pip flags: on a slow link npm's two-retry
# default turns a timeout into a hard "npm ci" failure mid-install.
ENV npm_config_fetch_retries=10 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=600000
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* is inlined at build time. The browser runs on the host, so
# this points at the host-published API port, not the compose service name.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start", "--", "-p", "3000"]
