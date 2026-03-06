import workflowService, {
  type IExecutionLog,
} from '@/services/workflow.service';
import apps from '@repo/common/@apps';
import { ExecutionStatus, StepType } from '@repo/common/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  AlertCircle,
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
  const observerTarget = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ['execution-logs', workflowId],
    queryFn: ({ pageParam = 1 }) =>
      workflowService.getExecutionLogs(workflowId!, 20, pageParam),
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

  const getAppDetails = (appId: string) => apps.find((app) => app.id === appId);

  const getStepDetails = (
    stepId: string,
    appId: string,
    stepType: StepType,
  ) => {
    const app = getAppDetails(appId);
    if (!app) return null;
    if (stepType === StepType.TRIGGER) {
      return app.triggers?.find((t) => t.id === stepId) ?? null;
    }
    if (stepType === StepType.ACTION) {
      return app.actions?.find((a) => a.id === stepId) ?? null;
    }
    return null;
  };

  const allLogs = data?.pages.flatMap((page) => page.executionLogs) || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-hidden p-0 gap-0 w-full sm:max-w-md">
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 shrink-0">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-base leading-tight">
                Execution Logs
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                History of your workflow runs
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
              <p className="text-sm text-muted-foreground">Loading logs…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Failed to load logs</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Please try closing and reopening this panel
                </p>
              </div>
            </div>
          ) : allLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-muted">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">No runs yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Logs will appear here once your workflow runs
                </p>
              </div>
            </div>
          ) : (
            <div className="py-3 px-4 space-y-2">
              {allLogs.map((log: IExecutionLog, index: number) => {
                const app = getAppDetails(log.appId);
                const step = getStepDetails(
                  log.stepId,
                  log.appId,
                  log.stepType,
                );
                const status = statusConfig[log.status] ?? {
                  icon: <Clock className="h-3.5 w-3.5" />,
                  label: log.status,
                  classes: 'bg-muted text-muted-foreground border-border',
                  dot: 'bg-muted-foreground',
                };

                return (
                  <div
                    key={`${log.id}-${index}`}
                    className="group relative rounded-xl border bg-card hover:bg-accent/30 transition-colors duration-150 p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      {/* App icon */}
                      <div className="shrink-0 mt-0.5">
                        {app?.icon ? (
                          <img
                            src={app.icon}
                            alt={app.name}
                            className="h-8 w-8 object-contain rounded-md"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center">
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {log.appId.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top row: name + status icon */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug truncate">
                              {app?.name ?? log.appId}
                            </p>
                            {step?.name && (
                              <p className="text-xs text-muted-foreground truncate leading-snug">
                                {step.name}
                              </p>
                            )}
                          </div>
                          {/* Status badge */}
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border',
                              status.classes,
                            )}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </div>

                        {/* Message */}
                        {log.message && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {log.message}
                          </p>
                        )}

                        {/* Bottom row: step type + date */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wide">
                            {log.stepType}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={observerTarget} className="h-4" />

              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Loading more…</p>
                </div>
              )}

              {!hasNextPage && allLogs.length > 0 && (
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

export default LogsSheet;
