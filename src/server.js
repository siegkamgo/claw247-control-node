import express from 'express';
import { config } from './config.js';
import {
  createHelmetMiddleware,
  createApiLimiter,
  createCorsMiddleware,
  apiKeyMiddleware,
  errorHandler,
} from './security.js';
import healthRouter from './routes/health.js';
import workersRouter from './routes/workers.js';
import agentsRouter from './routes/agents.js';

const app = express();

// Middleware
app.use(createHelmetMiddleware());
app.use(express.json());
app.use(createApiLimiter());
app.use(createCorsMiddleware(config.base44Origin));
app.use(apiKeyMiddleware(config.apiKey));

// Routes
app.use('/health', healthRouter);
app.use('/api/workers', workersRouter);
app.use('/api/agents', agentsRouter);

// Error handler
app.use(errorHandler);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
