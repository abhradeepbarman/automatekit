import { Button } from '../ui/button';
import SendMessageForm from './discord/send-message-form';
import SendEmailForm from './gmail/send-email-form';
import HttpRequestForm from './system/http-request-form';
import TimerForm from './system/timer-form';
import WebhookForm from './system/webhook-form';

export interface EventFormProps {
  onSubmit: (metadata: Record<string, any>) => void;
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
    case 'system:webhook':
      return <WebhookForm {...props} />;
    case 'system:http-request':
      return <HttpRequestForm {...props} />;
    default:
      return (
        <Button className="w-full" onClick={() => props.onSubmit({})}>
          {props.submitLabel}
        </Button>
      );
  }
}
