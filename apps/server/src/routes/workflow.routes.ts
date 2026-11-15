import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflow,
  getAllWorkflows,
  getWorkflow,
  updateWorkflow,
} from '../controllers/workflow.controller';
import { getWorkflowExecutions } from '../controllers/executions.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.get('/', auth, getAllWorkflows);
router.get('/:id', auth, getWorkflow);
router.get('/:workflowId/executions', auth, getWorkflowExecutions);
router.post('/', auth, createWorkflow);
router.put('/:id', auth, updateWorkflow);
router.delete('/:id', auth, deleteWorkflow);

export default router;
