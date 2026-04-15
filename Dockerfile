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
      echo 'exec node api-server.js'; \
    } > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80

ENV PORT=80
ENV DATABASE_URL=postgres://postgres:%5E%26TN5Qkg3BTXpW%23eeqHj%40E@168.231.99.126:3232/site_anhanguera?sslmode=disable

ENTRYPOINT ["/entrypoint.sh"]
