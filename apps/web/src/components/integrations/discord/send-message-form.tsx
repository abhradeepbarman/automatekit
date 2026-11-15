import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendMessageSchema } from '@repo/integrations/schemas';
import { LoaderCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { EventFormProps } from '../registry';

type SendMessageValues = z.infer<typeof sendMessageSchema>;

const SendMessageForm = ({
  onSubmit,
  isLoading,
  submitLabel,
  defaultValues,
}: EventFormProps) => {
  const form = useForm<SendMessageValues>({
    resolver: zodResolver(sendMessageSchema),
    defaultValues: {
      webhookUrl: '',
      content: '',
      username: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="space-y-5"
    >
      <Field>
        <FieldLabel>Webhook URL</FieldLabel>
        <Controller
          control={form.control}
          name="webhookUrl"
          render={({ field }) => (
            <Input
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          In Discord: Channel settings → Integrations → Webhooks → Copy Webhook
          URL
        </p>
        {form.formState.errors.webhookUrl && (
          <FieldError errors={[form.formState.errors.webhookUrl]} />
        )}
      </Field>

      <Field>
        <FieldLabel>Message</FieldLabel>
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => (
            <Textarea
              placeholder="Message to send"
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.content && (
          <FieldError errors={[form.formState.errors.content]} />
        )}
      </Field>

      <Field>
        <FieldLabel>Bot name (optional)</FieldLabel>
        <Controller
          control={form.control}
          name="username"
          render={({ field }) => (
            <Input
              placeholder="Uses the webhook's name if empty"
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.username && (
          <FieldError errors={[form.formState.errors.username]} />
        )}
      </Field>

      <Button className="mt-8 w-full" type="submit" disabled={isLoading}>
        {isLoading ? <LoaderCircle className="animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
};

export default SendMessageForm;
