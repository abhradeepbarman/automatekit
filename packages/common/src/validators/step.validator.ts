import { z } from 'zod';
import { StepType } from '../types';

export const addStepSchema = z
  .object({
    app: z.string(),
    eventName: z.string(),
    metadata: z.any().optional(),
    index: z.number(),
    connectionId: z.string().optional(),
    type: z.enum([StepType.TRIGGER, StepType.ACTION]),
  })
  .refine((data) => !(data.index === 0 && data.type !== StepType.TRIGGER), {
    message: 'First step must be a trigger step',
    path: ['type'],
  })
  .refine((data) => !(data.index > 0 && data.type !== StepType.ACTION), {
    message: 'Steps after the first step must be action steps',
    path: ['type'],
  });

export const updateStepSchema = z
  .object({
    app: z.string().optional(),
    metadata: z.any().optional(),
    connectionId: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nothing to update',
    path: ['app', 'metadata', 'connectionId'],
  });
