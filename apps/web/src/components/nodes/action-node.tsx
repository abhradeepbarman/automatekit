import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import apps from '@repo/common/@apps';
import type { Node, NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import { MoreVertical, Trash2 } from 'lucide-react';

type IActionNodeData = Node<
  {
    appId: string;
    actionId: string;
    index: number;
    fields: any;
    onEditClick: () => void;
    onDeleteClick: () => void;
  },
  'actionNode'
>;

const ActionNode = ({ data }: NodeProps<IActionNodeData>) => {
  const appDetails = apps.filter((app) => app.id === data.appId)[0];
  const actionDetails = apps
    .filter((app) => app.id === data.appId)[0]
    ?.actions?.filter((action) => action.id === data.actionId)[0];

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
            <p className="text-xs text-muted-foreground mt-0.5">Action</p>
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
              onClick={data.onDeleteClick}
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
          {actionDetails?.name || 'Unknown Action'}
        </p>
        {actionDetails?.description && (
          <p className="text-xs text-muted-foreground">
            {actionDetails.description}
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

      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="h-2.5! w-2.5! bg-primary!"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! bg-primary!"
      />
    </div>
  );
};

export default ActionNode;
