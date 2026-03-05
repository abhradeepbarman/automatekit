import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import config from './config';
import { errorHandler } from './middlewares';
import {
  authRoutes,
  credentialRoutes,
  dashboardRoutes,
  stepRoutes,
  webhookRoutes,
  workflowRoutes,
} from './routes';

const app: Application = express();

// middlewares
app.use(express.json());
app.use(
  cors({
    origin: [config.APP_URL],
    credentials: true,
  }),
);
app.use(cookieParser());

// test route
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

// routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/workflow', workflowRoutes);
app.use('/api/v1/credential', credentialRoutes);
app.use('/api/v1/step', stepRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/webhook', webhookRoutes);

// global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

app.listen(config.PORT, () => {
  console.log(`Server is running on port ${config.PORT}`);
});

export default app;
