import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import workflowService from '@/services/workflow.service';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const APP_TITLE = 'AutomateKit';

interface WorkflowTitleProps {
  workflowId: string;
  name: string;
}

export default function WorkflowTitle({
  workflowId,
  name,
}: WorkflowTitleProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    document.title = name || APP_TITLE;
    return () => {
      document.title = APP_TITLE;
    };
  }, [name]);

  const { mutate: rename, isPending } = useMutation({
    mutationFn: (newName: string) =>
      workflowService.updateWorkflow(workflowId, newName),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow renamed');
    },
    onError: (error: AxiosError<{ message: string }>) => {
      console.error('Rename workflow failed:', error);
      toast.error("Couldn't rename workflow", {
        description:
          error?.response?.data?.message ||
          'Unable to rename workflow. Please try again.',
      });
    },
  });

  const startEditing = () => {
    setDraft(name);
    setIsEditing(true);
  };

  const cancel = () => setIsEditing(false);

  const save = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) return cancel();
    rename(trimmed);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
          }}
          aria-label="Workflow name"
          className="h-7 w-64"
          autoFocus
          disabled={isPending}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Save"
          aria-label="Save name"
          onClick={save}
          disabled={isPending}
        >
          <Check className="h-4 w-4 text-emerald-600" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          title="Cancel"
          aria-label="Cancel rename"
          onClick={cancel}
          disabled={isPending}
        >
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-1 pl-2">
      <h1 className="truncate text-sm font-medium">{name}</h1>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0 p-0"
        title="Rename workflow"
        aria-label="Rename workflow"
        onClick={startEditing}
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  );
}
