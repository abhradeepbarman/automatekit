import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PollingInterval } from '@repo/common/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { timerSchema } from '@repo/integrations/schemas';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import type { EventFormProps } from '../registry';

type TimerValues = z.infer<typeof timerSchema>;

const TimerForm = ({
  onSubmit,
  submitLabel,
  defaultValues,
}: EventFormProps) => {
  const form = useForm<TimerValues>({
    resolver: zodResolver(timerSchema),
    defaultValues: {
      intervalMs: PollingInterval.FIVE_MINUTES,
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
        name="intervalMs"
        render={({ field, fieldState }) => (
          <Field>
            <FieldLabel>Interval</FieldLabel>
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select an interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PollingInterval.ONE_MINUTE}>
                  1 min
                </SelectItem>
                <SelectItem value={PollingInterval.FIVE_MINUTES}>
                  5 min
                </SelectItem>
                <SelectItem value={PollingInterval.TEN_MINUTES}>
                  10 min
                </SelectItem>
              </SelectContent>
            </Select>
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

export default TimerForm;
