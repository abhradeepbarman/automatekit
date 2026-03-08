import credentialService from '@/services/credential.service';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface IConnectBtnProps {
  appId: string;
  stepType: string;
  selectedConnectionId?: string;
  onAuthSuccess?: (id: string) => void;
}

const ConnectBtn = ({
  appId,
  stepType,
  selectedConnectionId,
  onAuthSuccess,
}: IConnectBtnProps) => {
  const [code, setCode] = useState<string>('');

  const { data: connections, refetch: refetchConnections } = useQuery({
    queryKey: ['connections', appId, stepType],
    queryFn: () => credentialService.getConnections(appId, stepType),
  });

  const { refetch } = useQuery({
    queryKey: ['auth-url', appId],
    queryFn: () => credentialService.getAuthUrl(appId),
    enabled: false,
  });

  const { refetch: getToken } = useQuery({
    queryKey: ['token', appId],
    queryFn: () => credentialService.getToken(appId, code, stepType),
    enabled: false,
  });

  const handleClick = async () => {
    try {
      const { data } = await refetch();
      if (data && data.authUrl) {
        const width = 500;
        const height = 600;

        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        window.open(
          data.authUrl,
          'Authentication',
          `width=${width},height=${height},left=${left},top=${top}`,
        );
      }
    } catch (error) {
      console.error(error);
      toast.error('Something went wrong');
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OAUTH_SUCCESS') {
        setCode(event.data.code);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const fetchAccessToken = async () => {
      if (!code) return;

      try {
        const { data } = await getToken();
        if (data) {
          toast.success('Successfully connected!');
          refetchConnections();

          if (onAuthSuccess) {
            onAuthSuccess(data.id);
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to get access token');
      }
    };

    fetchAccessToken();
  }, [code]);

  const selectedConnection = connections?.find(
    (conn: any) => conn.id === selectedConnectionId,
  );

  return (
    <div className="space-y-2">
      {selectedConnectionId && selectedConnection ? (
        <div className="space-y-2">
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <p className="text-sm font-medium text-green-900">
              {selectedConnection.name}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onAuthSuccess?.('')}
          >
            Change connection
          </Button>
        </div>
      ) : (
        <>
          {connections && connections.length > 0 && (
            <Select
              value={selectedConnectionId || ''}
              onValueChange={(value) => onAuthSuccess?.(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select existing connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((connection: any) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={handleClick}
          >
            <Plus className="h-4 w-4" />
            Connect new account
          </Button>
        </>
      )}
    </div>
  );
};

export default ConnectBtn;
