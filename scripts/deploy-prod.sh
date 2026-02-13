#!/usr/bin/env bash
set -euo pipefail
REPO_URL="${1:-}"
DOMAIN="${2:-api.claw247.fun}"
BRANCH="${3:-main}"
REPO_DIR="/opt/claw247-control-node"
APP_USER="claw247"
ENV_FILE="/etc/default/claw247-controller"

usage(){
  cat <<EOF
Usage: sudo bash deploy-prod.sh <repo-url-or-empty-if-local> [domain] [branch]
- If <repo-url> is provided the script will attempt to clone it (SSH recommended).
- If empty, the script assumes the repo contents already exist at ${REPO_DIR} (e.g. copied via scp).
EOF
  exit 1
}

if [ "${UID:-0}" -ne 0 ]; then
  echo "Run as root or with sudo"; exit 1
fi

if [ -z "$REPO_URL" ]; then
  if [ ! -d "$REPO_DIR" ]; then
    echo "No repo present at ${REPO_DIR}. Either pass a repo URL or copy the repo to ${REPO_DIR}."; usage
  fi
else
  apt update
  apt install -y git curl ca-certificates gnupg build-essential libsqlite3-dev
  # Install Node 18
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt install -y nodejs
  # Clone (SSH recommended)
  rm -rf "$REPO_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$REPO_DIR" || {
    echo "git clone failed. If the repo is private, add an SSH deploy key to GitHub or copy the repo via scp."; exit 1
  }
fi

# Common setup
apt install -y nginx certbot python3-certbot-nginx

# Create app user
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"

# Install node deps
cd "$REPO_DIR"
if [ -f package-lock.json ]; then
  npm ci --production --no-audit --no-fund
else
  npm install --production --no-audit --no-fund
fi

# Ensure /etc/claw247 for worker key
mkdir -p /etc/claw247
if [ -f /root/.ssh/clawra_pool ]; then
  cp /root/.ssh/clawra_pool /etc/claw247/id_ed25519
  chown root:"$APP_USER" /etc/claw247/id_ed25519
  chmod 640 /etc/claw247/id_ed25519
  echo "Copied worker SSH key from /root/.ssh/clawra_pool"
else
  echo "No /root/.ssh/clawra_pool found; ensure worker key is placed at that path or copy into /etc/claw247/id_ed25519 later."
fi

# Generate API key if missing
mkdir -p "$(dirname "$ENV_FILE")"
if [ ! -f "$ENV_FILE" ]; then
  API_KEY="$(openssl rand -hex 24)"
  cat > "$ENV_FILE" <<EOF
PORT=3000
NODE_ENV=production
CLAW247_API_KEY=${API_KEY}
CLAW247_API_URL=https://${DOMAIN}
EOF
  chmod 640 "$ENV_FILE"
  echo "Wrote ${ENV_FILE} and generated API key:"
  echo "${API_KEY}"
else
  echo "${ENV_FILE} already exists; not overwriting."
fi

# systemd unit
cat > /etc/systemd/system/claw247-controller.service <<'UNIT'
[Unit]
Description=Claw247 Control Node
After=network.target

[Service]
User=claw247
EnvironmentFile=/etc/default/claw247-controller
WorkingDirectory=/opt/claw247-control-node
ExecStart=/usr/bin/node /opt/claw247-control-node/src/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now claw247-controller

# nginx site
cat > /etc/nginx/sites-available/claw247 <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/claw247 /etc/nginx/sites-enabled/claw247
nginx -t && systemctl reload nginx

# Obtain TLS if domain points to this VPS and certbot can reach it
if command -v certbot >/dev/null 2>&1; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m admin@"${DOMAIN}" || echo "certbot failed or additional action needed"
fi

# Run optional app bootstrap/seed/gen-known-hosts if scripts exist
if [ -f scripts/bootstrap-dev.js ]; then
  node scripts/bootstrap-dev.js || true
fi
if [ -f scripts/seed-workers.js ]; then
  node scripts/seed-workers.js || true
fi
if [ -f scripts/gen-known-hosts.js ]; then
  node scripts/gen-known-hosts.js || true
fi

echo "Deployment finished. Check service status: systemctl status claw247-controller"
echo "If a new API key was printed earlier, save it to your frontend (Base44) as CLAWRA_CONTROL_API_KEY."
