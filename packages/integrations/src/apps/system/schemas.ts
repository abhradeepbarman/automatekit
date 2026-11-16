import { HttpMethod, PollingInterval } from '@repo/common/types';
import { z } from 'zod';

export const timerSchema = z.object({
  intervalMs: z.enum(PollingInterval, 'Select an interval'),
});

export const webhookSchema = z
  .object({
    method: z.enum(HttpMethod),
    headerName: z
      .string()
      .trim()
      .max(64)
      .regex(/^[A-Za-z0-9-]*$/, 'Use only letters, numbers and dashes'),
    headerValue: z.string().max(256),
  })
  .refine((v) => !v.headerName === !v.headerValue, {
    message: 'Set both the header name and value, or neither',
    path: ['headerValue'],
  });

export const httpRequestSchema = z.object({
  method: z.enum(HttpMethod),
  url: z.url({ protocol: /^https?$/, error: 'Enter a valid http(s) URL' }),
  headers: z.array(
    z.object({
      key: z
        .string()
        .trim()
        .min(1, 'Header name is required')
        .regex(/^[A-Za-z0-9-]+$/, 'Use only letters, numbers and dashes'),
      value: z.string(),
    }),
  ),
  body: z.string(),
});

export type WebhookConfig = z.infer<typeof webhookSchema>;
export type HttpRequestConfig = z.infer<typeof httpRequestSchema>;
