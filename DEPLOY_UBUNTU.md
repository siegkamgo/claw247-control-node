# Deployment Guide: Ubuntu/Hetzner VPS

This guide covers deploying the Claw247 Control Node to an Ubuntu-based Hetzner VPS.

## Prerequisites

- Ubuntu 22.04 LTS or later
- Root or sudo access
- Worker SSH private key available at `/root/.ssh/clawra_pool`
- Domain name (e.g., `api.claw247.fun`) pointing to the VPS IP

## Quick Deploy

The fastest way is to use the deploy script. Copy it to the VPS and run:

```bash
scp scripts/deploy-prod.sh root@YOUR_VPS_IP:/tmp/
ssh root@YOUR_VPS_IP
sudo bash /tmp/deploy-prod.sh https://github.com/siegkamgo/claw247-control-node.git api.claw247.fun
```

Or if cloning via SSH (requires SSH key on GitHub):

```bash
sudo bash /tmp/deploy-prod.sh git@github.com:siegkamgo/claw247-control-node.git api.claw247.fun
```

The script will:
1. Install Node 18, git, nginx, certbot
2. Clone the repo to `/opt/claw247-control-node`
3. Create `claw247` system user
4. Copy worker SSH key from `/root/.ssh/clawra_pool`
5. Generate a production API key
6. Create systemd service and enable it
7. Configure nginx as reverse proxy
8. Request TLS certificate via certbot
9. Run bootstrap/seed/gen-known-hosts scripts

## Manual Step-by-Step

If you prefer manual steps:

### 1. Install Dependencies

```bash
apt update
apt install -y curl ca-certificates gnupg git build-essential libsqlite3-dev nginx certbot python3-certbot-nginx

# Install Node 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

### 2. Clone Repository

```bash
git clone https://github.com/siegkamgo/claw247-control-node.git /opt/claw247-control-node
cd /opt/claw247-control-node
```

### 3. Install npm Dependencies

```bash
npm ci --production --no-audit
```

### 4. Create App User

```bash
useradd --system --create-home --shell /usr/sbin/nologin claw247
```

### 5. Set Up SSH Key

Copy the worker SSH private key:

```bash
mkdir -p /etc/claw247
cp /root/.ssh/clawra_pool /etc/claw247/id_ed25519
chown root:claw247 /etc/claw247/id_ed25519
chmod 640 /etc/claw247/id_ed25519
```

### 6. Create Environment File

Create `/etc/default/claw247-controller`:

```bash
cat > /etc/default/claw247-controller <<EOF
PORT=3000
NODE_ENV=production
CLAW247_API_KEY=$(openssl rand -hex 24)
CLAW247_API_URL=https://api.claw247.fun
BASE44_ORIGIN=https://base44.example.com
SSH_KEY_PATH=/etc/claw247/id_ed25519
EOF

chmod 640 /etc/default/claw247-controller
```

**Save the API key printed above** — you'll need it to configure the Base44 frontend.

### 7. Create Systemd Service

Copy the systemd unit:

```bash
cp systemd/claw247-controller.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now claw247-controller
systemctl status claw247-controller
```

### 8. Configure Nginx

Copy and enable the nginx site:

```bash
cp nginx/claw247-controller.conf /etc/nginx/sites-available/claw247
ln -sf /etc/nginx/sites-available/claw247 /etc/nginx/sites-enabled/claw247
nginx -t
systemctl reload nginx
```

### 9. Set Up TLS with Certbot

```bash
certbot --nginx -d api.claw247.fun --non-interactive --agree-tos -m admin@claw247.fun
```

### 10. Bootstrap Application

```bash
cd /opt/claw247-control-node
npm run bootstrap
npm run seed
npm run gen-known-hosts
```

## Verification

Check service status:

```bash
systemctl status claw247-controller
journalctl -u claw247-controller -n 50
```

Test the API:

```bash
curl -s https://api.claw247.fun/health | jq .
```

Test with API key (replace with your actual key):

```bash
curl -s -H "X-CLAW247-API-KEY: your-api-key-here" https://api.claw247.fun/api/workers | jq .
```

## Troubleshooting

### Service won't start

```bash
journalctl -u claw247-controller -n 100 -x
```

### SSH to workers failing

- Ensure `/etc/claw247/id_ed25519` exists and is readable by `claw247` user
- Check `data/known_hosts` exists: `ls -la /opt/claw247-control-node/data/`
- Run `npm run gen-known-hosts` again

### TLS certificate issues

```bash
certbot renew --dry-run
certbot logs
```

Certbot renews automatically via `--renew-hook`. Check:

```bash
systemctl list-timers certbot
```

### Nginx reverse proxy issues

```bash
nginx -t
systemctl reload nginx
curl -v https://api.claw247.fun/health
```

## Updates

To update to the latest code:

```bash
cd /opt/claw247-control-node
git pull
npm ci --production
systemctl restart claw247-controller
```

## Security Notes

- The API key is stored in `/etc/default/claw247-controller` (mode 640).
- SSH key is at `/etc/claw247/id_ed25519` (mode 640, readable by `claw247`).
- Nginx enforces HTTPS with strong TLS via Certbot.
- Rate limiting: 60 requests per minute per IP.
- All API endpoints except `/health` require the API key.

## Production Checklist

- [ ] API key saved and configured in Base44
- [ ] Domain DNS resolves to VPS IP
- [ ] TLS certificate installed and auto-renews
- [ ] Systemd service running
- [ ] Worker SSH key at `/etc/claw247/id_ed25519`
- [ ] `data/known_hosts` generated with `npm run gen-known-hosts`
- [ ] Health endpoint responding: `curl https://api.claw247.fun/health`
- [ ] API endpoints accessible with API key

---

For more help, check `systemctl status claw247-controller` and `journalctl -u claw247-controller`.
