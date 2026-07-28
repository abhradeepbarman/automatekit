import { Router } from 'express';
import { webhookListener } from '../controllers/webhook.controller';

const router: Router = Router();

router.post('/:path', webhookListener);

export default router;
