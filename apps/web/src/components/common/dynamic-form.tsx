import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { type FieldConfig } from '@repo/common/types';
import { LoaderCircle } from 'lucide-react';
import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Field, FieldError, FieldLabel } from '../ui/field';
import { Input } from '../ui/input';

interface DynamicFormProps {
  fields: FieldConfig[] | undefined;
  onSubmit: (data: Record<string, any>) => void;
  submitLabel: string;
  isLoading: boolean;
  connectionId?: string;
  variables?: Record<string, { id: string; display: string }>;
}

const DynamicForm = ({
  fields,
  onSubmit,
  submitLabel,
  isLoading,
  variables,
}: DynamicFormProps) => {
  const schema = useMemo(() => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields?.forEach((field) => {
      schemaFields[field.name] = field.validations?.() ?? z.any();
    });

    return z.object(schemaFields);
  }, [fields]);

  const defaultValues = useMemo(() => {
    const values: Record<string, any> = {};
    fields?.forEach((field) => {
      values[field.name] =
        field.defaultValue ?? getDefaultValueForType(field.type);
    });
    return values;
  }, [fields]);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  function getDefaultValueForType(type: FieldConfig['type']): any {
    switch (type) {
      case 'checkbox':
        return false;
      case 'number':
        return '';
      case 'select':
        return '';
      default:
        return '';
    }
  }

  const renderTextInput = (field: FieldConfig) => {
    return (
      <Field key={field.name}>
        <FieldLabel>{field.label}</FieldLabel>
        <Input
          type={field.type}
          placeholder={field.placeholder}
          disabled={field.disabled}
          {...form.register(field.name)}
        />
        {form.formState.errors[field.name] && (
          <FieldError errors={[form.formState.errors[field.name] as any]} />
        )}
      </Field>
    );
  };

  const renderTextarea = (field: FieldConfig) => {
    return (
      <Field key={field.name}>
        <FieldLabel>{field.label}</FieldLabel>
        <textarea
          {...form.register(field.name)}
          placeholder={field.placeholder}
          disabled={field.disabled}
          className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        {form.formState.errors[field.name] && (
          <FieldError errors={[form.formState.errors[field.name] as any]} />
        )}
      </Field>
    );
  };

  const renderSelect = (field: FieldConfig) => {
    return (
      <Controller
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: controllerField, fieldState }) => (
          <Field>
            <FieldLabel>{field.label}</FieldLabel>
            <Select
              value={controllerField.value ?? ''}
              onValueChange={controllerField.onChange}
              disabled={field.disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  };

  const renderCheckbox = (field: FieldConfig) => {
    return (
      <Controller
        key={field.name}
        control={form.control}
        name={field.name}
        render={({ field: controllerField, fieldState }) => (
          <Field>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={controllerField.value === true}
                onCheckedChange={(checked) =>
                  controllerField.onChange(checked === true)
                }
                disabled={field.disabled}
              />
              <FieldLabel className="mt-0">{field.label}</FieldLabel>
            </div>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    );
  };

  const renderField = (field: FieldConfig) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return renderTextInput(field);

      case 'textarea':
        return renderTextarea(field);

      case 'select':
        return renderSelect(field);

      case 'checkbox':
        return renderCheckbox(field);

      default:
        return null;
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      {fields?.map((field) => renderField(field))}
      <Button className="mt-8 w-full" type="submit" disabled={isLoading}>
        {isLoading ? <LoaderCircle className="animate-spin" /> : submitLabel}
      </Button>
    </form>
  );
};

export default DynamicForm;
