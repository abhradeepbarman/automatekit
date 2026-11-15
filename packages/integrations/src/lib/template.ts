import { z } from 'zod';

const template = z.string().regex(/\{\{\s*[\w.-]+\s*\}\}/);

export const orTemplate = <T extends z.ZodType>(schema: T, message: string) =>
  z.union([schema, template], { error: message });
