import Navbar from '@/components/common/navbar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Switch } from '@/components/ui/switch';
import { cn, formatDate } from '@/lib/utils';
import dashboardService from '@/services/dashboard.service';
import workflowService from '@/services/workflow.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import {
  Activity,
  Check,
  CircleAlert,
  Pencil,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const Dashboard = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data: workflowsData, isLoading } = useQuery({
    queryKey: ['workflows', page, limit],
    queryFn: () => workflowService.getAllWorkflows(page, limit),
  });

  const { mutateAsync: createWorkflowFn, isPending } = useMutation({
    mutationFn: () => workflowService.createWorkflow(),
    onSuccess: (data) => navigate(`/workflow/${data.id}`),
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Create workflow failed:', error);
      toast.error('Create workflow failed', {
        description:
          error?.response?.data?.message ||
          'Unable to create workflow. Please try again.',
      });
    },
  });

  const handleCreateWorkflow = async () => {
    await createWorkflowFn();
  };

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (workflowsData && page < workflowsData.pagination.totalPages) {
      setPage(page + 1);
    }
  };

  const handlePageClick = (pageNum: number) => {
    setPage(pageNum);
  };

  const formatLastRun = (lastExecutedAt: string | null) => {
    if (!lastExecutedAt) return 'Never';
    try {
      return formatDate(lastExecutedAt);
    } catch {
      return 'Never';
    }
  };

  const workflows = workflowsData?.workflows || [];
  const pagination = workflowsData?.pagination;

  useEffect(() => {
    if (
      pagination &&
      page > pagination.totalPages &&
      pagination.totalPages > 0
    ) {
      setPage(pagination.totalPages);
    }
  }, [pagination, page]);

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardService.getStats(),
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header band */}
      <div className="relative overflow-hidden border-b border-border/60">
        <div className="bg-line-grid mask-fade-b pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-muted-foreground">
                Welcome back
              </p>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Overview of your automation activity
              </p>
            </div>

            <Button
              size="lg"
              className="group h-11 gap-2 rounded-xl shadow-sm"
              onClick={handleCreateWorkflow}
              disabled={isPending}
            >
              <Plus className="size-4 transition-transform group-hover:rotate-90" />
              {isPending ? 'Creating...' : 'Create workflow'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Workflows"
              value={stats?.totalWorkflows?.toString() || '0'}
              subtitle="All time"
              icon={WorkflowIcon}
            />
            <StatCard
              title="Runs"
              value={stats?.totalRuns?.toString() || '0'}
              subtitle="Last 30 days"
              icon={Activity}
            />
            <StatCard
              title="Errors"
              value={stats?.totalErrors?.toString() || '0'}
              subtitle="Last 30 days"
              icon={CircleAlert}
              accent="destructive"
            />
          </div>

          <Card className="overflow-hidden border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent workflows</CardTitle>
              <CardDescription>
                Your most recently created automations
              </CardDescription>
              {pagination && pagination.total > 0 && (
                <CardAction>
                  <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {pagination.total} total
                  </span>
                </CardAction>
              )}
            </CardHeader>

            <CardContent className="px-3 sm:px-4">
              {isLoading ? (
                <div className="divide-y divide-border/60">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <WorkflowItemSkeleton key={i} />
                  ))}
                </div>
              ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
                  <div className="grid size-14 place-items-center rounded-2xl border border-border bg-muted text-muted-foreground">
                    <WorkflowIcon className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold">No workflows yet</p>
                    <p className="text-sm text-muted-foreground">
                      Create your first workflow to get started
                    </p>
                  </div>
                  <Button
                    className="mt-1 gap-2"
                    onClick={handleCreateWorkflow}
                    disabled={isPending}
                  >
                    <Plus className="size-4" />
                    {isPending ? 'Creating...' : 'Create workflow'}
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {workflows.map((workflow) => (
                    <WorkflowItem
                      key={workflow.id}
                      id={workflow.id}
                      name={workflow.name}
                      isActive={workflow.isActive}
                      lastRun={formatLastRun(workflow.lastExecutedAt)}
                      createdAt={workflow.createdAt}
                      onClick={() => navigate(`/workflow/${workflow.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border/60 px-6 py-3">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={handlePreviousPage}
                        className={
                          page === 1
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>

                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1,
                    )
                      .filter((p) => {
                        return (
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - page) <= 1
                        );
                      })
                      .map((pageNum, idx, arr) => {
                        const showEllipsisBefore =
                          idx > 0 && pageNum - arr[idx - 1] > 1;

                        return (
                          <Fragment key={pageNum}>
                            {showEllipsisBefore && (
                              <PaginationItem>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )}
                            <PaginationItem>
                              <PaginationLink
                                isActive={pageNum === page}
                                onClick={() => handlePageClick(pageNum)}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          </Fragment>
                        );
                      })}

                    <PaginationItem>
                      <PaginationNext
                        onClick={handleNextPage}
                        className={
                          page === pagination.totalPages
                            ? 'pointer-events-none opacity-50'
                            : 'cursor-pointer'
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'default',
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: 'default' | 'destructive';
}) => {
  return (
    <Card className="group relative overflow-hidden border-border/60 py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <div className="bg-dot-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <CardContent className="relative flex items-start justify-between gap-4 p-5">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-display text-4xl font-bold leading-none tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl border transition-colors',
            accent === 'destructive'
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-border bg-muted text-foreground/70 group-hover:bg-primary group-hover:text-primary-foreground',
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
};

const WorkflowItemSkeleton = () => {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-4">
      <div className="flex items-center gap-3">
        <div className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-3.5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="h-5 w-10 animate-pulse rounded-full bg-muted" />
    </div>
  );
};

const WorkflowItem = ({
  id,
  name,
  isActive,
  lastRun,
  createdAt,
  onClick,
}: {
  id: string;
  name: string;
  isActive: boolean;
  lastRun: string;
  createdAt: string;
  onClick?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const { mutate: updateWorkflowName, isPending: isRenamePending } =
    useMutation({
      mutationFn: (newName: string) =>
        workflowService.updateWorkflow(id, newName),
      onSuccess: () => {
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        toast.success('Workflow renamed successfully');
      },
      onError: (error: AxiosError<{ message: string }>) => {
        console.error('Rename workflow failed:', error);
        toast.error('Rename failed', {
          description:
            error?.response?.data?.message ||
            'Unable to rename workflow. Please try again.',
        });
        setEditedName(name);
      },
    });

  const { mutate: toggleWorkflowStatus, isPending: isStatusPending } =
    useMutation({
      mutationFn: (newIsActive: boolean) =>
        workflowService.updateWorkflow(id, undefined, newIsActive),
      onSuccess: (_, newIsActive) => {
        queryClient.invalidateQueries({ queryKey: ['workflows'] });
        toast.success(
          `Workflow ${newIsActive ? 'activated' : 'paused'} successfully`,
        );
      },
      onError: (error: AxiosError<{ message: string }>) => {
        console.error('Toggle status failed:', error);
        toast.error('Status update failed', {
          description:
            error?.response?.data?.message ||
            'Unable to update workflow status. Please try again.',
        });
      },
    });

  const { mutate: deleteWorkflow, isPending: isDeletePending } = useMutation({
    mutationFn: () => workflowService.deleteWorkflow(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Workflow deleted successfully');
      setShowDeleteDialog(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Delete workflow failed:', error);
      toast.error('Delete failed', {
        description:
          error?.response?.data?.message ||
          'Unable to delete workflow. Please try again.',
      });
    },
  });

  const handleSave = () => {
    if (editedName.trim() && editedName !== name) {
      updateWorkflowName(editedName.trim());
    } else {
      setIsEditing(false);
      setEditedName(name);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleDelete = () => {
    deleteWorkflow();
  };

  return (
    <div
      className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3.5 transition-colors hover:bg-muted/60"
      onClick={isEditing ? undefined : onClick}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            'grid size-9 shrink-0 place-items-center rounded-lg border transition-colors',
            isActive
              ? 'border-foreground/15 bg-primary/5 text-foreground'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          <WorkflowIcon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 max-w-xs"
                autoFocus
                disabled={isRenamePending}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={handleSave}
                disabled={isRenamePending}
              >
                <Check className="h-4 w-4 text-emerald-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 shrink-0 p-0"
                onClick={handleCancel}
                disabled={isRenamePending}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-1">
                <p className="truncate font-medium">{name}</p>
                <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditing(true);
                    }}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <AlertDialog
                    open={showDeleteDialog}
                    onOpenChange={setShowDeleteDialog}
                  >
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 shrink-0 p-0 hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete workflow?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete the workflow "{name}" and all its steps.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={handleDelete}
                          disabled={isDeletePending}
                        >
                          {isDeletePending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Created {formatDate(createdAt)}</span>
                <span className="size-0.5 rounded-full bg-muted-foreground/40" />
                <span>Last run: {lastRun}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={cn(
            'hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium sm:inline-flex',
            isActive
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-1.5 rounded-full',
              isActive ? 'bg-emerald-500' : 'bg-muted-foreground/50',
            )}
          />
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => toggleWorkflowStatus(checked)}
          disabled={isStatusPending}
        />
      </div>
    </div>
  );
};
