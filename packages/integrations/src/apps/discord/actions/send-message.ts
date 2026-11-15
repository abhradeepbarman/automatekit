import axios from 'axios';
import { z } from 'zod';
import { type IAction } from '@repo/common/types';

const DISCORD_WEBHOOK_URL =
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
  username: z
    .string()
    .max(80, 'Name must be 80 characters or fewer')
    .optional(),
});

export type SendMessageMetadata = z.infer<typeof sendMessageSchema>;

const sendMessageDataAvailable = [
  { key: 'messageId', label: 'Message ID', type: 'string' },
  { key: 'channelId', label: 'Channel ID', type: 'string' },
  { key: 'content', label: 'Message', type: 'string' },
] as const;
type SendMessageDataAvailable = typeof sendMessageDataAvailable;

export const sendMessage: IAction<
  SendMessageMetadata,
  SendMessageDataAvailable
> = {
  id: 'send-message',
  name: 'Send Message',
  description: 'Send a message to a Discord channel',

  schema: sendMessageSchema,
  dataAvailable: sendMessageDataAvailable,

  run: async ({ metadata }) => {
    const parsed = sendMessageSchema.safeParse(metadata);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? 'Invalid message',
        statusCode: 400,
      };
    }

    const { webhookUrl, content, username } = parsed.data;

    try {
      const { data } = await axios.post(
        webhookUrl,
        { content, username: username || undefined },
        { params: { wait: true } },
      );

      return {
        success: true,
        message: 'Message sent successfully',
        statusCode: 200,
        data: {
          messageId: data.id,
          channelId: data.channel_id,
          content: data.content,
        },
      };
    } catch (error: Error | any) {
      const statusCode = error?.response?.status ?? 500;
      const providerMessage = error?.response?.data?.message ?? error?.message;

      return {
        success: false,
        message: providerMessage
          ? `Error sending message: ${providerMessage}`
          : 'Error sending message',
        statusCode,
      };
    }
  },
};
