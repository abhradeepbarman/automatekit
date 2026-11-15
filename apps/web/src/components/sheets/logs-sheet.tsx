import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useFindEvent } from '@/hooks/use-integrations';
import { cn, formatDate } from '@/lib/utils';
import workflowService, { type IExecution } from '@/services/workflow.service';
import { ExecutionStatus } from '@repo/common/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CircleAlert, History, LoaderCircle, RefreshCw } from 'lucide-react';
import { useParams } from 'react-router-dom';

interface LogsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedId?: string;
  onSelect: (execution: IExecution | null) => void;
}

const statusStyle: Record<ExecutionStatus, string> = {
  [ExecutionStatus.COMPLETED]: 'bg-emerald-500/10 text-emerald-600',
  [ExecutionStatus.FAILED]: 'bg-red-500/10 text-red-600',
  [ExecutionStatus.RUNNING]: 'bg-blue-500/10 text-blue-600',
  [ExecutionStatus.PENDING]: 'bg-amber-500/10 text-amber-600',
};

const StatusBadge = ({ status }: { status: ExecutionStatus }) => (
  <span
    className={cn(
      'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
      statusStyle[status],
    )}
  >
    {status.toLowerCase()}
  </span>
);

const LogsSheet = ({
  open,
  onOpenChange,
  selectedId,
  onSelect,
}: LogsSheetProps) => {
  const { id: workflowId } = useParams() as { id: string };
  const findEvent = useFindEvent();

  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['executions', workflowId],
    queryFn: ({ pageParam }) =>
      workflowService.getExecutions(workflowId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
    enabled: open,
  });

  const executions = data?.pages.flatMap((page) => page.executions) ?? [];
  const total = data?.pages[0]?.pagination.total ?? 0;
  const emptyState = isLoading
    ? { icon: LoaderCircle, title: 'Loading runs…', spin: true }
    : isError
      ? {
          icon: CircleAlert,
          title: "Couldn't load runs",
          hint: 'Check your connection and try again.',
          retry: true,
        }
      : executions.length === 0
        ? {
            icon: History,
            title: 'No runs yet',
            hint: 'Runs appear here when the trigger fires or you press Run.',
          }
        : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <SheetTitle>Executions</SheetTitle>
            {total > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {total}
              </span>
            )}
            <button
              type="button"
              title="Refresh"
              onClick={() => refetch()}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <RefreshCw
                className={cn('size-3.5', isFetching && 'animate-spin')}
              />
            </button>
          </div>
          <SheetDescription>
            Select a run to see it on the canvas
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {emptyState && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pb-16 text-center">
              <div className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                <emptyState.icon
                  className={cn('size-5', emptyState.spin && 'animate-spin')}
                />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">{emptyState.title}</p>
                {emptyState.hint && (
                  <p className="text-xs text-muted-foreground">
                    {emptyState.hint}
                  </p>
                )}
              </div>
              {emptyState.retry && (
                <Button size="sm" variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              )}
            </div>
          )}

          {executions.map((execution) => (
            <button
              type="button"
              key={execution.id}
              onClick={() =>
                onSelect(execution.id === selectedId ? null : execution)
              }
              className={cn(
                'block w-full rounded-xl border p-3.5 text-left hover:bg-accent/30',
                execution.id === selectedId && 'ring-2 ring-primary',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatDate(execution.startedAt)}
                </span>
                <StatusBadge status={execution.status} />
              </div>

              <ol className="mt-3 space-y-2">
                {execution.steps.map((step) => {
                  const { event, icon } = findEvent(
                    step.integration,
                    step.stepType,
                    step.eventName,
                  );
                  return (
                    <li key={step.id} className="flex items-start gap-2.5">
                      {icon && (
                        <img
                          src={icon}
                          alt=""
                          className="mt-0.5 size-5 object-contain"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">
                            {event?.name ?? step.eventName}
                          </p>
                          <StatusBadge status={step.status} />
                        </div>
                        {step.message && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {step.message}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </button>
          ))}

          {hasNextPage && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                'Load more'
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LogsSheet;
