# Claw247 Control Node

Production-ready MVP API for managing OpenClaw gateways on remote workers via SSH.

## Features

- **HTTPS API** for managing remote workers (OpenClaw gateways)
- **SSH allowlist** for secure worker communication
- **API key authentication** (X-CLAW247-API-KEY header)
- **Rate limiting** (60 req/min per IP)
- **CORS support** for frontend integration
- **SQLite persistence** for workers and agents
- **Systemd + Nginx** for production deployment
- **TLS via Certbot** for HTTPS

## API Endpoints

### Health Check (Public)
```
GET /health
```
Returns `{ "status": "ok" }`

### Workers
```
GET /api/workers
POST /api/workers
POST /api/workers/:workerId/test-ssh
GET /api/workers/:workerId/openclaw/status
POST /api/workers/:workerId/openclaw/restart
POST /api/workers/:workerId/openclaw/rotate-token
```

### Agents
```
GET /api/agents
POST /api/agents
POST /api/agents/:agentId/action
```

All endpoints except `/health` require `X-CLAW247-API-KEY` header.

## Local Development

1. Clone and install:
```bash
git clone https://github.com/siegkamgo/claw247-control-node.git
cd claw247-control-node
npm install
```

2. Bootstrap (creates .env and database):
```bash
npm run bootstrap
npm run seed
npm run gen-known-hosts
```

3. Start the dev server:
```bash
npm run dev
```

Server will listen on `http://localhost:3000`

4. Test:
```bash
npm run test-health
```

## Production Deployment

See [DEPLOY_UBUNTU.md](DEPLOY_UBUNTU.md) for full deployment steps.

Quick deploy to Hetzner VPS:
```bash
sudo bash /tmp/deploy-claw247.sh "https://github.com/siegkamgo/claw247-control-node.git" "api.claw247.fun"
```

## Environment Variables

- `NODE_ENV` - `development` or `production`
- `PORT` - Server port (default: 3000)
- `CLAW247_API_KEY` - API key for authentication
- `CLAW247_API_URL` - Base URL of the API
- `BASE44_ORIGIN` - CORS origin for frontend
- `SSH_KEY_PATH` - Path to worker SSH private key (default: /root/.ssh/clawra_pool)

## Architecture

- **Express.js** - HTTP server
- **better-sqlite3** - SQLite database
- **zod** - Input validation
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **System SSH** - Worker SSH communication

## License

MIT
