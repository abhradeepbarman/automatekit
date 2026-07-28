import { logger } from '@repo/common/utils';
import db from '@repo/db';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { sql } from 'drizzle-orm';
import config from './config';
import { errorHandler } from './middlewares';
import {
  authRoutes,
  credentialRoutes,
  dashboardRoutes,
  integrationsRoutes,
  stepRoutes,
  webhookRoutes,
  workflowRoutes,
} from './routes';
import { CustomErrorHandler } from './utils';

const app: Application = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(
  cors({
    origin: [config.APP_URL],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

const rateLimitOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};

app.use(
  '/api',
  rateLimit({ windowMs: 60_000, limit: 300, ...rateLimitOptions }),
);

app.use(
  '/api/v1/auth',
  rateLimit({ windowMs: 15 * 60_000, limit: 20, ...rateLimitOptions }),
);

app.use(
  '/api/v1/webhook',
  rateLimit({ windowMs: 60_000, limit: 60, ...rateLimitOptions }),
);

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`select 1`);
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    logger.error('Readiness check failed: ' + error);
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workflow', workflowRoutes);
app.use('/api/v1/credential', credentialRoutes);
app.use('/api/v1/step', stepRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/webhook', webhookRoutes);
app.use('/api/v1/integrations', integrationsRoutes);

app.use((_req, _res, next) => next(CustomErrorHandler.notFound()));

app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(`Server is running on port ${config.PORT}`);
});

let shuttingDown = false;

const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Received ${signal}, shutting down server...`);

  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);

  server.close((error) => {
    clearTimeout(timeout);
    if (error) {
      logger.error('Error during shutdown: ' + error);
      process.exit(1);
    }
    logger.info('Server shut down cleanly');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection: ' + reason);
});

export default app;
