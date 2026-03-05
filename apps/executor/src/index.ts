import 'dotenv/config';
import '@repo/queue';
import './workers/action-worker';
import { startTriggerChecker } from './trigger-checker';

startTriggerChecker();
