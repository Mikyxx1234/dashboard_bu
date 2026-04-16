# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Create entrypoint inline (avoids Windows CRLF issues)
RUN { \
      echo '#!/bin/sh'; \
      echo 'cat <<ENVEOF > /usr/share/nginx/html/env-config.js'; \
      echo 'window.__env__ = {'; \
      echo '  SUPABASE_URL: "${VITE_SUPABASE_URL}",'; \
      echo '  SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",'; \
      echo '  SUPABASE_SERVICE_KEY: "${VITE_SUPABASE_SERVICE_KEY}",'; \
      echo '  KOMMO_TOKEN: "${VITE_KOMMO_TOKEN}",'; \
      echo '  KOMMO_SUBDOMAIN: "${VITE_KOMMO_SUBDOMAIN:-academicosoead}"'; \
      echo '};'; \
      echo 'ENVEOF'; \
      echo 'exec nginx -g "daemon off;"'; \
    } > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
