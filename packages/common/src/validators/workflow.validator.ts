import { z } from 'zod';
import { StepType } from '../types';

export const saveWorkflowStepsSchema = z.object({
  steps: z.array(
    z.object({
      id: z.uuid(),
      type: z.enum(StepType),
      integration: z.string().min(1),
      eventName: z.string().min(1),
      connectionId: z.uuid().nullish(),
      config: z.record(z.string(), z.unknown()).default({}),
      position: z.object({ x: z.number(), y: z.number() }),
    }),
  ),
  edges: z.array(z.object({ source: z.uuid(), target: z.uuid() })),
});

export type SaveWorkflowSteps = z.infer<typeof saveWorkflowStepsSchema>;
