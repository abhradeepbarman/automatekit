import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { HttpMethod } from '@repo/common/types';
import { webhookSchema, type WebhookConfig } from '@repo/integrations/schemas';
import { RefreshCw } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import type { EventFormProps } from '../registry';

const generateSecret = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

const WebhookForm = ({
  onSubmit,
  submitLabel,
  defaultValues,
}: EventFormProps) => {
  const form = useForm<WebhookConfig>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      method: HttpMethod.POST,
      headerName: '',
      headerValue: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="space-y-5"
    >
      <Controller
        control={form.control}
        name="method"
        render={({ field }) => (
          <Field>
            <FieldLabel>HTTP method</FieldLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(HttpMethod).map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription>
              Requests with any other method are rejected.
            </FieldDescription>
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="headerName"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Header name (optional)</FieldLabel>
            <Input placeholder="X-Webhook-Secret" {...field} />
            <FieldDescription>
              Callers must send this header with the value below.
            </FieldDescription>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="headerValue"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Header value</FieldLabel>
            <div className="flex gap-2">
              <Input
                placeholder="Secret value"
                className="font-mono"
                {...field}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Generate a secret"
                onClick={() =>
                  form.setValue('headerValue', generateSecret(), {
                    shouldValidate: true,
                  })
                }
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button className="mt-8 w-full" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
};

export default WebhookForm;
