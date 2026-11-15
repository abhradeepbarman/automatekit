import { Button } from '../ui/button';
import SendMessageForm from './discord/send-message-form';
import SendEmailForm from './gmail/send-email-form';
import TimerForm from './system/timer-form';

export interface EventFormProps {
  onSubmit: (metadata: Record<string, any>) => void;
  isLoading: boolean;
  submitLabel: string;
  defaultValues?: Record<string, any>;
}

export function EventConfigForm({
  appId,
  eventId,
  ...props
}: EventFormProps & { appId?: string; eventId?: string }) {
  switch (`${appId}:${eventId}`) {
    case 'gmail:send-email':
      return <SendEmailForm {...props} />;
    case 'discord:send-message':
      return <SendMessageForm {...props} />;
    case 'system:timer':
      return <TimerForm {...props} />;
    default:
      return (
        <Button
          className="w-full"
          disabled={props.isLoading}
          onClick={() => props.onSubmit({})}
        >
          {props.isLoading ? 'Adding...' : props.submitLabel}
        </Button>
      );
  }
}
