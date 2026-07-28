import integrationService from '@/services/integration.service';
import { useQuery } from '@tanstack/react-query';

export const useIntegrations = () =>
  useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationService.getIntegrations(),
    staleTime: Infinity,
  });
