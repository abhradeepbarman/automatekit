import { z } from 'zod';
import { orTemplate } from '../../lib/template';

export const sendEmailSchema = z.object({
  to: orTemplate(z.email(), 'Enter an email address or a {{variable}}'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});
