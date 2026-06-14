import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { sendEmailSchema } from '@repo/integrations/schemas';
import { LoaderCircle } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { EventFormProps } from '../registry';

type SendEmailValues = z.infer<typeof sendEmailSchema>;

const SendEmailForm = ({
  onSubmit,
  isLoading,
  submitLabel,
  defaultValues,
}: EventFormProps) => {
  const form = useForm<SendEmailValues>({
    resolver: zodResolver(sendEmailSchema),
    defaultValues: {
      to: '',
      subject: '',
      body: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="space-y-5"
    >
      <Field>
        <FieldLabel>To</FieldLabel>
        <Controller
          control={form.control}
          name="to"
          render={({ field }) => (
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.to && (
          <FieldError errors={[form.formState.errors.to]} />
        )}
      </Field>

      <Field>
        <FieldLabel>Subject</FieldLabel>
        <Controller
          control={form.control}
          name="subject"
          render={({ field }) => (
            <Input
              placeholder="Email subject"
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.subject && (
          <FieldError errors={[form.formState.errors.subject]} />
        )}
      </Field>

      <Field>
        <FieldLabel>Body</FieldLabel>
        <Controller
          control={form.control}
          name="body"
          render={({ field }) => (
            <Textarea
              placeholder="Email body"
              value={field.value || ''}
              onChange={field.onChange}
            />
          )}
        />
        {form.formState.errors.body && (
          <FieldError errors={[form.formState.errors.body]} />
        )}
      </Field>

      <Button className="mt-8 w-full" type="submit" disabled={isLoading}>
        {isLoading ? <LoaderCircle className="animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
};

export default SendEmailForm;
