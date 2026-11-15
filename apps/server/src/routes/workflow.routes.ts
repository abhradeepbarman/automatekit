import { Router } from 'express';
import {
  getExecution,
  getWorkflowExecutions,
} from '../controllers/executions.controller';
import {
  createWorkflow,
  deleteWorkflow,
  getAllWorkflows,
  getWorkflow,
  runWorkflow,
  saveWorkflowSteps,
  updateWorkflow,
} from '../controllers/workflow.controller';
import { auth } from '../middlewares';

const router: Router = Router();

router.get('/', auth, getAllWorkflows);
router.post('/', auth, createWorkflow);
router.get('/:id', auth, getWorkflow);
router.put('/:id', auth, updateWorkflow);
router.delete('/:id', auth, deleteWorkflow);
router.put('/:id/steps', auth, saveWorkflowSteps);
router.post('/:id/run', auth, runWorkflow);
router.get('/:workflowId/executions', auth, getWorkflowExecutions);
router.get('/:workflowId/executions/:executionId', auth, getExecution);

export default router;
