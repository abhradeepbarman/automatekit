import { z } from 'zod';

export const DISCORD_WEBHOOK_URL =
  /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export const sendMessageSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .regex(DISCORD_WEBHOOK_URL, 'Enter a valid Discord webhook URL'),
  content: z
    .string()
    .min(1, 'Message is required')
    .max(2000, 'Message must be 2000 characters or fewer'),
  username: z.string().max(80, 'Name must be 80 characters or fewer'),
});
