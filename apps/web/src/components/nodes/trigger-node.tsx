import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import apps from '@repo/common/@apps';
import { AppType } from '@repo/common/types';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { Copy, MoreVertical, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

type ITriggerNodeData = Node<
  {
    appId: string;
    triggerId: string;
    index: number;
    fields: any;
    handleEditClick: () => void;
    handleDeleteClick: () => void;
    webhook?: {
      id: string;
      url: string;
    };
  },
  'triggerNode'
>;

const TriggerNode = ({ data }: NodeProps<ITriggerNodeData>) => {
  const appDetails = apps.filter((app) => app.id === data.appId)[0];
  const triggerDetails = apps
    .filter((app) => app.id === data.appId)[0]
    ?.triggers?.filter((trigger) => trigger.id === data.triggerId)[0];

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(data.webhook!.url);
    toast.success('Webhook URL copied');
  };

  return (
    <div className="relative min-w-65 rounded-md border bg-card shadow-sm">
      {/* Header */}
      <div className="px-3 py-2 border-b bg-muted/20 flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1">
          {appDetails?.icon && (
            <img
              src={appDetails.icon}
              alt={appDetails.name}
              className="h-6 w-6 object-contain shrink-0 mr-3"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">
              {appDetails?.name || 'Unknown App'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Trigger</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-2 p-1 hover:bg-muted rounded-sm transition-colors">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* <DropdownMenuItem onClick={data.handleEditClick}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem> */}
            <DropdownMenuItem
              onClick={data.handleDeleteClick}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Content */}
      <div className="px-3 py-2 space-y-1">
        <p className="text-sm font-medium">
          {triggerDetails?.name || 'Unknown Trigger'}
        </p>
        {triggerDetails?.description && (
          <p className="text-xs text-muted-foreground">
            {triggerDetails.description}
          </p>
        )}
      </div>
      {/* Footer */}
      {data.fields && Object.keys(data.fields).length > 0 && (
        <div className="px-3 py-1.5 border-t bg-muted/10">
          <p className="text-xs text-muted-foreground">
            {Object.keys(data.fields).length} field
            {Object.keys(data.fields).length !== 1 ? 's' : ''} configured
          </p>
        </div>
      )}

      {/* webhook */}
      {appDetails.id === AppType.SYSTEM &&
        triggerDetails?.id === 'webhook' &&
        data.webhook && (
          <div className="px-3 py-2 border-t bg-muted/10 flex items-center justify-between gap-2">
            <Badge variant="secondary" className="text-[10px]">
              POST • JSON
            </Badge>

            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={copyWebhook}
            >
              <Copy className="h-3 w-3" />
              Copy URL
            </Button>
          </div>
        )}

      {/* Connection handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! bg-primary!"
      />
    </div>
  );
};

export default TriggerNode;
