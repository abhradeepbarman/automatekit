import workflowService, {
  type IExecution,
  type IExecutionStep,
} from '@/services/workflow.service';
import { useIntegrations } from '@/hooks/use-integrations';
import { ExecutionStatus, StepType } from '@repo/common/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import { cn, formatDate } from '@/lib/utils';

interface ILogsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig: Record<
  ExecutionStatus,
  { icon: React.ReactNode; label: string; classes: string; dot: string }
> = {
  [ExecutionStatus.COMPLETED]: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Completed',
    classes:
      'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  [ExecutionStatus.FAILED]: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    label: 'Failed',
    classes: 'bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400',
    dot: 'bg-red-500',
  },
  [ExecutionStatus.PENDING]: {
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Pending',
    classes:
      'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  [ExecutionStatus.RUNNING]: {
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    label: 'Running',
    classes:
      'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
    dot: 'bg-blue-500 animate-pulse',
  },
};

const LogsSheet = ({ open, onOpenChange }: ILogsSheetProps) => {
  const { id: workflowId } = useParams();
  const { data: integrations } = useIntegrations();
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['executions', workflowId],
    queryFn: ({ pageParam = 1 }) =>
      workflowService.getExecutions(workflowId!, pageParam),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.pagination.hasMore ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: open && !!workflowId,
  });

  useEffect(() => {
    if (!observerTarget.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const getAppDetails = (appId: string) =>
    integrations?.find((app) => app.id === appId);

  const getStepDetails = (
    eventName: string | null,
    appId: string,
    stepType: StepType,
  ) => {
    const app = getAppDetails(appId);
    if (!app || !eventName) return null;
    if (stepType === StepType.TRIGGER) {
      return app.triggers.find((t) => t.id === eventName) ?? null;
    }
    if (stepType === StepType.ACTION) {
      return app.actions.find((a) => a.id === eventName) ?? null;
    }
    return null;
  };

  const executions = data?.pages.flatMap((page) => page.executions) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden p-0 gap-0 w-full sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-base leading-tight">
                  Executions
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  History of your workflow runs
                </SheetDescription>
              </div>
            </div>

            <button
              onClick={() => refetch()}
              className="mr-6 h-8 w-8 flex items-center justify-center rounded-md border bg-background hover:bg-accent transition"
            >
              <RefreshCw
                className={cn(
                  'h-4 w-4',
                  isFetching
                    ? 'animate-spin text-primary'
                    : 'text-muted-foreground',
                )}
              />
            </button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">
                Loading executions…
              </p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Failed to load executions</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please try closing and reopening this panel
                </p>
              </div>
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No runs yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Executions will appear here once your workflow runs
                </p>
              </div>
            </div>
          ) : (
            <div className="py-3 px-4 space-y-2">
              {executions.map((execution: IExecution) => (
                <div
                  key={execution.id}
                  className="rounded-xl border bg-card p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDate(execution.startedAt)}
                    </span>
                    <StatusBadge status={execution.status} />
                  </div>

                  {execution.error && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-red-600 dark:text-red-400">
                      {execution.error}
                    </p>
                  )}

                  <ol className="mt-3 space-y-2.5">
                    {execution.steps.map((step: IExecutionStep) => {
                      const app = getAppDetails(step.integration);
                      const event = getStepDetails(
                        step.eventName,
                        step.integration,
                        step.stepType,
                      );

                      return (
                        <li key={step.id} className="flex items-start gap-2.5">
                          {app?.icon ? (
                            <img
                              src={app.icon}
                              alt={app.name}
                              className="mt-0.5 h-6 w-6 shrink-0 rounded object-contain"
                            />
                          ) : (
                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted">
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {step.integration.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium leading-snug">
                                {event?.name ?? app?.name ?? step.eventName}
                              </p>
                              <span
                                title={statusConfig[step.status]?.label}
                                className={cn(
                                  'size-1.5 shrink-0 rounded-full',
                                  statusConfig[step.status]?.dot,
                                )}
                              />
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
                </div>
              ))}

              <div ref={observerTarget} className="h-4" />

              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Loading more…</p>
                </div>
              )}

              {!hasNextPage && executions.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-[11px] text-muted-foreground">
                    You've reached the end
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const StatusBadge = ({ status }: { status: ExecutionStatus }) => {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        config?.classes ?? 'border-border bg-muted text-muted-foreground',
      )}
    >
      {config?.icon}
      {config?.label ?? status}
    </span>
  );
};

export default LogsSheet;
