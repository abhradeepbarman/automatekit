import integrationService from '@/services/integration.service';
import { useQuery } from '@tanstack/react-query';

// Integration metadata rarely changes within a session, so cache it indefinitely.
export const useIntegrations = () =>
  useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationService.getIntegrations(),
    staleTime: Infinity,
  });
