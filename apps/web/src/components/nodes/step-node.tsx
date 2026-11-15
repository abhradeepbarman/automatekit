import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEditor, type StepData } from '@/components/workflow/editor-context';
import { useFindEvent } from '@/hooks/use-integrations';
import { cn } from '@/lib/utils';
import workflowService from '@/services/workflow.service';
import { ExecutionStatus, StepType, SystemEvent } from '@repo/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { AxiosError } from 'axios';
import {
  Copy,
  LoaderCircle,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';

const statusRing: Record<ExecutionStatus, string> = {
  [ExecutionStatus.COMPLETED]: 'ring-2 ring-emerald-500',
  [ExecutionStatus.FAILED]: 'ring-2 ring-red-500',
  [ExecutionStatus.RUNNING]: 'ring-2 ring-blue-500',
  [ExecutionStatus.PENDING]: 'ring-2 ring-amber-500',
};

const StepNode = ({ id, data }: NodeProps<Node<StepData, 'step'>>) => {
  const { workflowId, isDirty, runStatus, addAction, editStep, deleteStep } =
    useEditor();
  const queryClient = useQueryClient();
  const isTrigger = data.type === StepType.TRIGGER;
  const { app, event } = useFindEvent()(
    data.integration,
    data.type,
    data.eventName,
  );
  const status = runStatus[id];

  const { mutate: run, isPending: isRunning } = useMutation({
    mutationFn: () => workflowService.runWorkflow(workflowId),
    onSuccess: () => {
      toast.success('Workflow started');
      queryClient.invalidateQueries({ queryKey: ['executions', workflowId] });
    },
    onError: (error: AxiosError<{ message: string }>) =>
      toast.error('Could not run workflow', {
        description: error.response?.data?.message,
      }),
  });

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(data.webhook!.url);
    toast.success('Webhook URL copied');
  };

  return (
    <div
      className={cn(
        'relative w-64 rounded-md border bg-card shadow-sm',
        status && statusRing[status],
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="h-2.5! w-2.5! bg-primary!"
        />
      )}

      <div className="flex items-center gap-3 border-b bg-muted/20 px-3 py-2">
        {app?.icon && (
          <img src={app.icon} alt={app.name} className="h-6 w-6 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {event?.name ?? data.eventName}
          </p>
          <p className="text-xs text-muted-foreground">
            {app?.name ?? data.integration} · {isTrigger ? 'Trigger' : 'Action'}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="nodrag rounded-sm p-1 hover:bg-muted">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editStep(id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteStep(id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {data.webhook && (
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="text-[10px] font-medium text-muted-foreground">
            {data.webhook.method}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="nodrag h-6 gap-1 text-xs"
            onClick={copyWebhook}
          >
            <Copy className="h-3 w-3" />
            Copy URL
          </Button>
        </div>
      )}

      {data.eventName === SystemEvent.TAP && (
        <div className="px-3 py-2">
          <Button
            size="sm"
            className="nodrag h-7 w-full gap-1.5 text-xs"
            onClick={() => run()}
            disabled={isRunning || isDirty}
            title={isDirty ? 'Save the workflow first' : undefined}
          >
            {isRunning ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
            Run
          </Button>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="h-2.5! w-2.5! bg-primary!"
      />
      <Button
        size="icon"
        variant="outline"
        title="Add action"
        className="nodrag absolute top-1/2 -right-10 h-6 w-6 -translate-y-1/2 rounded-full"
        onClick={() => addAction(id)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default StepNode;
