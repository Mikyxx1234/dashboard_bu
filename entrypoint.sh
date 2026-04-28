#!/bin/sh

# Injeta variáveis de ambiente no env-config.js (acessível pelo frontend)
cat <<EOF > /usr/share/nginx/html/env-config.js
window.__env__ = {
  SUPABASE_URL: "${VITE_SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",
  SUPABASE_SERVICE_KEY: "${VITE_SUPABASE_SERVICE_KEY}",
  KOMMO_TOKEN: "${VITE_KOMMO_TOKEN}",
  KOMMO_SUBDOMAIN: "${VITE_KOMMO_SUBDOMAIN:-academicosoead}"
};
EOF

# Gera nginx.conf com subdomínio dinâmico do Kommo
export KOMMO_SUBDOMAIN="${VITE_KOMMO_SUBDOMAIN:-academicosoead}"
envsubst '${KOMMO_SUBDOMAIN}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
