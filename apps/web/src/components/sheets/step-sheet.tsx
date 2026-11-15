import ConnectBtn from '@/components/common/connect-btn';
import { EventConfigForm } from '@/components/integrations/registry';
import { Badge } from '@/components/ui/badge';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { StepData } from '@/components/workflow/editor-context';
import { useIntegrations } from '@/hooks/use-integrations';
import type { IntegrationDataField } from '@/services/integration.service';
import { StepType } from '@repo/common/types';
import { useState } from 'react';
import { toast } from 'sonner';

interface StepSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: StepType;
  initial?: StepData;
  dataAvailable?: IntegrationDataField[];
  onSubmit: (step: StepData) => void;
}

const StepSheet = ({ open, onOpenChange, ...props }: StepSheetProps) => {
  const label = props.type === StepType.TRIGGER ? 'Trigger' : 'Action';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto pb-5">
        <SheetHeader>
          <SheetTitle>{`${props.initial ? 'Edit' : 'Add'} ${label}`}</SheetTitle>
          <SheetDescription>
            {props.type === StepType.TRIGGER
              ? 'Choose what starts this workflow'
              : 'Choose what happens next'}
          </SheetDescription>
        </SheetHeader>
        <StepForm
          {...props}
          label={label}
          onSubmit={(step) => {
            props.onSubmit(step);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

const StepForm = ({
  type,
  label,
  initial,
  dataAvailable,
  onSubmit,
}: Omit<StepSheetProps, 'open' | 'onOpenChange'> & { label: string }) => {
  const { data: integrations } = useIntegrations();
  const [integration, setIntegration] = useState(initial?.integration ?? '');
  const [eventName, setEventName] = useState(initial?.eventName ?? '');
  const [connectionId, setConnectionId] = useState(
    initial?.connectionId ?? null,
  );
  const [error, setError] = useState('');

  const isTrigger = type === StepType.TRIGGER;
  const apps = integrations?.filter(
    (a) => (isTrigger ? a.triggers : a.actions).length > 0,
  );
  const app = apps?.find((a) => a.id === integration);
  const events = (isTrigger ? app?.triggers : app?.actions) ?? [];

  const submit = (config: Record<string, unknown>) => {
    if (app?.hasAuth && !connectionId) {
      return setError('Connect an account first');
    }
    onSubmit({ type, integration, eventName, connectionId, config });
  };

  return (
    <div className="space-y-6 px-4">
      <Field>
        <FieldLabel>App</FieldLabel>
        <Select
          value={integration}
          onValueChange={(value) => {
            setIntegration(value);
            setEventName('');
            setConnectionId(null);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an app" />
          </SelectTrigger>
          <SelectContent>
            {apps?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <div className="flex items-center gap-2">
                  {a.icon && <img src={a.icon} alt="" className="h-5 w-5" />}
                  {a.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {app && (
        <Field>
          <FieldLabel>{label}</FieldLabel>
          <Select value={eventName} onValueChange={setEventName}>
            <SelectTrigger>
              <SelectValue placeholder={`Select a ${label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {app?.hasAuth && eventName && (
        <Field>
          <FieldLabel>Connection</FieldLabel>
          <ConnectBtn
            appId={app.id}
            stepType={type}
            selectedConnectionId={connectionId ?? undefined}
            onAuthSuccess={(id) => {
              setConnectionId(id);
              setError('');
            }}
          />
          {error && <FieldError errors={[{ message: error }]} />}
        </Field>
      )}

      {eventName && !!dataAvailable?.length && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Data from previous step</p>
          <div className="flex flex-wrap gap-2">
            {dataAvailable.map((field) => (
              <Badge
                key={field.key}
                variant="secondary"
                className="cursor-pointer"
                title={`Copy {{${field.key}}}`}
                onClick={() => {
                  navigator.clipboard.writeText(`{{${field.key}}}`);
                  toast.success(`Copied {{${field.key}}}`);
                }}
              >
                {field.label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {eventName && (
        <div className="border-t pt-6">
          <EventConfigForm
            key={eventName}
            appId={integration}
            eventId={eventName}
            defaultValues={
              initial?.eventName === eventName ? initial.config : undefined
            }
            submitLabel={initial ? 'Update' : `Add ${label}`}
            isLoading={false}
            onSubmit={submit}
          />
        </div>
      )}
    </div>
  );
};

export default StepSheet;
