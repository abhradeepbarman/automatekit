import integrationService from '@/services/integration.service';
import { StepType } from '@repo/common/types';
import { useQuery } from '@tanstack/react-query';

export const useIntegrations = () =>
  useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationService.getIntegrations(),
    staleTime: Infinity,
  });

export const useFindEvent = () => {
  const { data: integrations } = useIntegrations();

  return (integration: string, type: StepType, eventName: string) => {
    const app = integrations?.find((a) => a.id === integration);
    const events = type === StepType.TRIGGER ? app?.triggers : app?.actions;
    const event = events?.find((e) => e.id === eventName);
    return { app, event, icon: event?.icon ?? app?.icon };
  };
};
