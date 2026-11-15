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
  Lock,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';

const statusRing: Record<ExecutionStatus, string> = {
  [ExecutionStatus.COMPLETED]: 'border-emerald-500 ring-4 ring-emerald-500/15',
  [ExecutionStatus.FAILED]: 'border-red-500 ring-4 ring-red-500/15',
  [ExecutionStatus.RUNNING]: 'border-blue-500 ring-4 ring-blue-500/15',
  [ExecutionStatus.PENDING]: 'border-amber-500 ring-4 ring-amber-500/15',
};

const StepNode = ({
  id,
  data,
  selected,
}: NodeProps<Node<StepData, 'step'>>) => {
  const { workflowId, isDirty, runStatus, addAction, editStep, deleteStep } =
    useEditor();
  const queryClient = useQueryClient();
  const isTrigger = data.type === StepType.TRIGGER;
  const { app, event, icon } = useFindEvent()(
    data.integration,
    data.type,
    data.eventName,
  );
  const status = runStatus[id];

  const { mutate: run, isPending: isRunning } = useMutation({
    mutationFn: () => workflowService.runWorkflow(workflowId),
    onSuccess: () => {
      toast.success('Workflow started', {
        description: 'Open Executions to follow the run.',
      });
      queryClient.invalidateQueries({ queryKey: ['executions', workflowId] });
    },
    onError: (error: AxiosError<{ message: string }>) =>
      toast.error("Couldn't run workflow", {
        description: error.response?.data?.message,
      }),
  });

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(data.webhook!.url);
    toast.success('Webhook URL copied');
  };

  const handleClass =
    'size-3! border-2! border-muted-foreground/40! bg-background! transition-colors hover:border-primary!';

  return (
    <div
      className={cn(
        'group relative w-72 rounded-xl border bg-card shadow-xs transition-shadow hover:shadow-md',
        selected && 'border-primary/40 ring-4 ring-primary/10',
        status && statusRing[status],
      )}
    >
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className={handleClass}
        />
      )}

      <div className="flex items-center gap-3 p-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border bg-muted/40">
          {icon ? (
            <img src={icon} alt="" className="size-6 object-contain" />
          ) : (
            <Zap className="size-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[10px] font-semibold tracking-wide uppercase',
              isTrigger
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isTrigger && <Zap className="size-2.5 fill-current" />}
            {isTrigger ? 'Trigger' : 'Action'}
          </span>
          <p className="mt-1 truncate text-sm leading-tight font-semibold">
            {event?.name ?? data.eventName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {app?.name ?? data.integration}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="nodrag self-start rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted hover:text-foreground data-[state=open]:opacity-100">
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => editStep(id)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => deleteStep(id)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {data.eventName === SystemEvent.WEBHOOK && (
        <div className="flex items-center justify-between gap-2 rounded-b-xl border-t bg-muted/30 px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground ring-1 ring-border">
              {String(data.config.method ?? 'POST')}
            </span>
            {!!data.config.headerName && (
              <span
                className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"
                title="Requests must include this header"
              >
                <Lock className="size-3 shrink-0" />
                <span className="truncate">
                  {String(data.config.headerName)}
                </span>
              </span>
            )}
          </div>
          {data.webhook ? (
            <Button
              variant="ghost"
              size="sm"
              className="nodrag h-7 shrink-0 gap-1.5 text-xs"
              onClick={copyWebhook}
            >
              <Copy className="size-3.5" />
              Copy URL
            </Button>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Save to get URL
            </span>
          )}
        </div>
      )}

      {data.eventName === SystemEvent.TAP && (
        <div className="rounded-b-xl border-t bg-muted/30 p-2">
          <Button
            size="sm"
            className="nodrag h-8 w-full gap-1.5 text-xs"
            onClick={() => run()}
            disabled={isRunning || isDirty}
            title={isDirty ? 'Save the workflow first' : undefined}
          >
            {isRunning ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            Run workflow
          </Button>
        </div>
      )}

      <Handle type="source" position={Position.Right} className={handleClass} />
      <button
        type="button"
        title="Add action"
        className="nodrag absolute top-1/2 -right-11 grid size-6 -translate-y-1/2 place-items-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:border-primary hover:text-foreground"
        onClick={() => addAction(id)}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
};

export default StepNode;
