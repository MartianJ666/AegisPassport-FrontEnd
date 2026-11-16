# --- Build stage: compile the Vite/Vue SPA bundle ---
FROM node:22-alpine AS build
WORKDIR /app

# Install deps against the lockfile first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle. baseURL is '/api' and OAuth paths are root-
# relative, so no build-time backend URL is needed — nginx proxies at runtime.
COPY . .
RUN npm run build

# --- Runtime stage: nginx serving the static bundle + reverse proxy ---
FROM nginx:1.27-alpine
COPY nginx/default.conf   /etc/nginx/conf.d/default.conf
COPY nginx/proxy_headers.conf /etc/nginx/proxy_headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null 2>&1 || exit 1
