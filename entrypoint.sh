#!/bin/sh

cat <<EOF > /usr/share/nginx/html/env-config.js
window.__env__ = {
  SUPABASE_URL: "${VITE_SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}",
  SUPABASE_SERVICE_KEY: "${VITE_SUPABASE_SERVICE_KEY}"
};
EOF

exec nginx -g "daemon off;"
