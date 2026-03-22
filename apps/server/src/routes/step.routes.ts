import { Router } from 'express';
import {
  addStep,
  deleteStep,
  getStep,
  updateStep,
} from '../controllers/step.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.get('/:id', auth, getStep);
router.post('/workflow/:id', auth, addStep);
router.put('/:id', auth, updateStep);
router.delete('/:id', auth, deleteStep);

export default router;
