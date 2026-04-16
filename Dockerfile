# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY api-server.js ./

RUN { \
      echo '#!/bin/sh'; \
      echo 'cat <<ENVEOF > /app/dist/env-config.js'; \
      echo 'window.__env__ = {'; \
      echo '  SUPABASE_URL: "${VITE_SUPABASE_URL}",'; \
      echo '  SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",'; \
      echo '  SUPABASE_SERVICE_KEY: "${VITE_SUPABASE_SERVICE_KEY}"'; \
      echo '};'; \
      echo 'ENVEOF'; \
      echo 'exec node /app/api-server.js'; \
    } > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
