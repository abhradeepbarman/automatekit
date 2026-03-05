import { Router } from 'express';
import {
  createWebhook,
  webhookListener,
} from '../controllers/webhook.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.post('/workflow/:id', auth, createWebhook);
router.post('/:path', webhookListener);

export default router;
