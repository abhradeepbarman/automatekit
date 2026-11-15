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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { HttpMethod } from '@repo/common/types';
import {
  httpRequestSchema,
  type HttpRequestConfig,
} from '@repo/integrations/schemas';
import { Plus, X } from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { EventFormProps } from '../registry';

const HttpRequestForm = ({
  onSubmit,
  submitLabel,
  defaultValues,
}: EventFormProps) => {
  const form = useForm<HttpRequestConfig>({
    resolver: zodResolver(httpRequestSchema),
    defaultValues: {
      method: HttpMethod.GET,
      url: '',
      headers: [],
      body: '',
      ...defaultValues,
    },
  });
  const headers = useFieldArray({ control: form.control, name: 'headers' });
  const method = useWatch({ control: form.control, name: 'method' });

  return (
    <form
      onSubmit={form.handleSubmit((values) => onSubmit(values))}
      className="space-y-5"
    >
      <div className="flex gap-2">
        <Controller
          control={form.control}
          name="method"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(HttpMethod).map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <Controller
          control={form.control}
          name="url"
          render={({ field, fieldState }) => (
            <Field>
              <Input
                placeholder="https://api.example.com/items"
                aria-label="URL"
                {...field}
              />
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <Field>
        <FieldLabel>Headers</FieldLabel>
        {headers.fields.map((header, index) => (
          <div key={header.id} className="flex items-start gap-2">
            <Controller
              control={form.control}
              name={`headers.${index}.key`}
              render={({ field, fieldState }) => (
                <div className="flex-1">
                  <Input placeholder="Name" {...field} />
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              )}
            />
            <Controller
              control={form.control}
              name={`headers.${index}.value`}
              render={({ field }) => (
                <Input placeholder="Value" className="flex-1" {...field} />
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Remove header"
              onClick={() => headers.remove(index)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit gap-1.5"
          onClick={() => headers.append({ key: '', value: '' })}
        >
          <Plus className="size-3.5" />
          Add header
        </Button>
      </Field>

      {method !== HttpMethod.GET && (
        <Controller
          control={form.control}
          name="body"
          render={({ field }) => (
            <Field>
              <FieldLabel>Body</FieldLabel>
              <Textarea
                placeholder='{"name": "{{body.name}}"}'
                className="min-h-28 font-mono text-xs"
                {...field}
              />
              <FieldDescription>
                Valid JSON is sent as JSON; anything else is sent as text.
              </FieldDescription>
            </Field>
          )}
        />
      )}

      <Button className="mt-8 w-full" type="submit">
        {submitLabel}
      </Button>
    </form>
  );
};

export default HttpRequestForm;
