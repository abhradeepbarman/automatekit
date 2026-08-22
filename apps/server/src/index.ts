import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
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

app.use(
  cors({
    origin: [config.APP_URL],
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
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

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

export default app;
