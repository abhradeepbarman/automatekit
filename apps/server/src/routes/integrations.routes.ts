import { Router } from 'express';
import { getIntegrations } from '../controllers/integrations.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.get('/', auth, getIntegrations);

export default router;
