import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export function createHelmetMiddleware() {
  return helmet();
}

export function createApiLimiter() {
  return rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export function createCorsMiddleware(allowedOrigin) {
  return (req, res, next) => {
    if (allowedOrigin && req.headers.origin === allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CLAW247-API-KEY');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
    } else {
      next();
    }
  };
}

export function apiKeyMiddleware(expectedKey) {
  return (req, res, next) => {
    // Health endpoint is public
    if (req.path === '/health') {
      return next();
    }

    const key = req.headers['x-claw247-api-key'];
    if (!key || key !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  };
}

export function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(statusCode).json({ error: message });
}
