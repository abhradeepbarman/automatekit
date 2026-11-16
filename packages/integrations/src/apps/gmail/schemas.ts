import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.email('Enter a valid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
