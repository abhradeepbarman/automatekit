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
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Switch } from '@/components/ui/switch';
import { formatDate } from '@/lib/utils';
import dashboardService from '@/services/dashboard.service';
import workflowService from '@/services/workflow.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
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

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Overview of your automation activity
              </p>
            </div>

            <Button
              className="h-10 w-37.5"
              onClick={handleCreateWorkflow}
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create new workflow'}
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Workflows"
              value={stats?.totalWorkflows?.toString() || '0'}
            />
            <StatCard
              title="Runs (30 days)"
              value={stats?.totalRuns?.toString() || '0'}
            />
            <StatCard
              title="Errors"
              value={stats?.totalErrors?.toString() || '0'}
            />
          </div>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Recent workflows</CardTitle>
              <CardDescription>
                Your most recently created automations
              </CardDescription>
            </CardHeader>

            <CardContent className="divide-y">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <p className="text-muted-foreground">No workflows yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create your first workflow to get started
                  </p>
                </div>
              ) : (
                workflows.map((workflow) => (
                  <WorkflowItem
                    key={workflow.id}
                    id={workflow.id}
                    name={workflow.name}
                    isActive={workflow.isActive}
                    lastRun={formatLastRun(workflow.lastExecutedAt)}
                    createdAt={workflow.createdAt}
                    onClick={() => navigate(`/workflow/${workflow.id}`)}
                  />
                ))
              )}
            </CardContent>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-3">
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
                          <div key={pageNum} className="flex items-center">
                            {showEllipsisBefore && (
                              <span className="px-2 text-muted-foreground">
                                ...
                              </span>
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
                          </div>
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

const StatCard = ({ title, value }: { title: string; value: string }) => {
  return (
    <Card className="relative h-30 border-border/50 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-y-0 left-0 w-1 bg-primary/70" />
      <CardContent className="flex h-full flex-col justify-center gap-1 p-6 pl-7">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">Last 30 days</p>
      </CardContent>
    </Card>
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
      className="group flex items-center justify-between gap-4 py-4 cursor-pointer hover:bg-accent/50 transition-colors px-2 -mx-2 rounded"
      onClick={isEditing ? undefined : onClick}
    >
      <div className="flex-1 min-w-0">
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
              className="h-8 w-8 p-0 shrink-0"
              onClick={handleSave}
              disabled={isRenamePending}
            >
              <Check className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 shrink-0"
              onClick={handleCancel}
              disabled={isRenamePending}
            >
              <X className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 mb-1">
              <p className="font-medium truncate mr-3">{name}</p>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 shrink-0"
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
                      className="h-6 w-6 p-0 shrink-0"
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
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">
                Created {formatDate(createdAt)}
              </p>
              <p className="text-xs text-muted-foreground">
                Last run: {lastRun}
              </p>
            </div>
          </>
        )}
      </div>

      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-muted-foreground">
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <Switch
          checked={isActive}
          onCheckedChange={toggleWorkflowStatus}
          disabled={isStatusPending}
        />
      </div>
    </div>
  );
};
