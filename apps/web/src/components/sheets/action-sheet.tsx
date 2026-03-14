import { NODE_SPACING } from '@/constants/workflow';
import stepService from '@/services/step.service';
import apps from '@repo/common/@apps';
import { StepType, type TDataAvailable } from '@repo/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Edge, Node } from '@xyflow/react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import ConnectBtn from '../common/connect-btn';
import DynamicForm from '../common/dynamic-form';
import { Button } from '../ui/button';
import { Field, FieldError, FieldLabel } from '../ui/field';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Badge } from '../ui/badge';
import { Copy } from 'lucide-react';

interface IActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  sourceNodeId: string;
  setSelectedSourceNodeId: Dispatch<SetStateAction<string>>;
  setActionSheetOpen: Dispatch<SetStateAction<boolean>>;
  handleEditClick: () => void;
  handleDeleteClick: (nodeId: string) => void;
  dataAvailable?: TDataAvailable;
}

const ActionSheet = ({
  open,
  onOpenChange,
  nodes,
  setNodes,
  setEdges,
  sourceNodeId,
  setSelectedSourceNodeId,
  setActionSheetOpen,
  handleEditClick,
  handleDeleteClick,
  dataAvailable,
}: IActionSheetProps) => {
  const queryClient = useQueryClient();
  const { id: workflowId } = useParams();
  const [commonFields, setCommonFields] = useState({
    appId: '',
    actionId: '',
    connectionId: '',
  });
  const [commonFieldsErr, setCommonFieldsErr] = useState({
    appId: '',
    actionId: '',
    connectionId: '',
  });

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ['create-action'],
    mutationFn: (metadata: Node) => {
      const stepNodes = nodes.filter(
        (n) => n.type === 'triggerNode' || n.type === 'actionNode',
      );
      return stepService.addStep(
        workflowId!,
        commonFields.appId,
        commonFields.actionId,
        stepNodes.length,
        StepType.ACTION,
        commonFields.connectionId,
        metadata,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['workflow', workflowId],
      });
    },
  });

  const selectedAction = useMemo(() => {
    if (!commonFields.appId || !commonFields.actionId) return null;
    const app = apps.find((a) => a.id === commonFields.appId);
    return app?.actions?.find((a) => a.id === commonFields.actionId);
  }, [commonFields.appId, commonFields.actionId]);

  const clearFields = () => {
    setCommonFields({
      appId: '',
      actionId: '',
      connectionId: '',
    });
    setCommonFieldsErr({
      appId: '',
      actionId: '',
      connectionId: '',
    });
  };

  const onSubmit = async (fieldData: any) => {
    const { appId, actionId, connectionId } = commonFields;

    if (!appId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        appId: 'App is required',
      }));
    if (!actionId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        actionId: 'Action is required',
      }));
    if (!connectionId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        connectionId: 'Connection is required',
      }));

    // Find the source node to calculate position
    const sourceNode = nodes.find((n) => n.id === sourceNodeId);
    if (!sourceNode) {
      toast.error('Error adding action', {
        description: 'Source node not found. Please try again.',
      });
      return;
    }

    // Calculate the correct index by counting only actual step nodes
    const stepNodes = nodes.filter(
      (n) => n.type === 'triggerNode' || n.type === 'actionNode',
    );

    const nodeDetails: Node = {
      id: '',
      type: 'actionNode',
      position: {
        x: sourceNode.position.x + NODE_SPACING,
        y: sourceNode.position.y,
      },
      data: {
        index: stepNodes.length,
        appId: commonFields.appId,
        actionId: commonFields.actionId,
        fields: fieldData || {},
      },
    };

    try {
      const newStepDetails = await mutateAsync(nodeDetails);
      const addActionButtonId = `add-action-${newStepDetails.metadata.id}`;

      setNodes((prev: Node[]) => {
        const oldButtonId = `add-action-${sourceNodeId}`;
        const filtered = prev.filter((n) => n.id !== oldButtonId);

        return [
          ...filtered,
          {
            ...newStepDetails.metadata,
            data: {
              ...newStepDetails.metadata.data,
              onEditClick: () => handleEditClick(),
              onDeleteClick: () =>
                handleDeleteClick(newStepDetails.metadata.id),
            },
          },
          {
            id: addActionButtonId,
            type: 'addActionButton',
            position: {
              x: nodeDetails.position.x + NODE_SPACING,
              y: nodeDetails.position.y,
            },
            data: {
              onAddClick: () => {
                setSelectedSourceNodeId(newStepDetails.metadata.id);
                setActionSheetOpen(true);
              },
            },
          },
        ];
      });

      setEdges((prev) => {
        const oldButtonId = `add-action-${sourceNodeId}`;
        const filtered = prev.filter((e) => e.target !== oldButtonId);

        return [
          ...filtered,
          {
            id: `${sourceNodeId}-${newStepDetails.metadata.id}`,
            source: sourceNodeId,
            target: newStepDetails.metadata.id,
          },
          {
            id: `${newStepDetails.metadata.id}-${addActionButtonId}`,
            source: newStepDetails.metadata.id,
            target: addActionButtonId,
          },
        ];
      });

      toast.success('Action added successfully', {
        description: 'The action has been added to your workflow.',
      });

      clearFields();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add action:', error);
      toast.error('Failed to add action', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const variables = Object.values(dataAvailable || {}).map((v) => ({
    id: v.id,
    display: v.display || v.id,
  }));

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          clearFields();
        }
      }}
    >
      <SheetContent className="overflow-y-auto pb-5">
        <SheetHeader>
          <SheetTitle>Add Action</SheetTitle>
          <SheetDescription>
            Choose an action to add to your workflow
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <Field>
            <FieldLabel>App</FieldLabel>
            <Select
              value={commonFields.appId}
              onValueChange={(val) => {
                setCommonFields((prev) => ({
                  ...prev,
                  appId: val,
                  actionId: '',
                  connectionId: '',
                }));
                setCommonFieldsErr((prev) => ({
                  ...prev,
                  appId: '',
                  actionId: '',
                  connectionId: '',
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an app" />
              </SelectTrigger>
              <SelectContent>
                {apps
                  .filter((app) => app.actions && app.actions.length > 0)
                  .map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      <div className="flex items-center gap-2">
                        {app.icon && (
                          <img
                            src={app.icon}
                            alt={app.name}
                            className="h-5 w-5 object-contain"
                          />
                        )}
                        <span>{app.name}</span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {commonFieldsErr.appId && (
              <FieldError errors={[{ message: commonFieldsErr.appId }]} />
            )}
          </Field>

          {commonFields.appId && (
            <Field>
              <FieldLabel>Action</FieldLabel>
              <Select
                value={commonFields.actionId}
                onValueChange={(val) => {
                  setCommonFields((prev) => ({
                    ...prev,
                    actionId: val,
                  }));
                  setCommonFieldsErr((prev) => ({
                    ...prev,
                    actionId: '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an action" />
                </SelectTrigger>
                <SelectContent>
                  {apps
                    .find((app) => app.id === commonFields.appId)
                    ?.actions?.map((action) => (
                      <SelectItem key={action.id} value={action.id}>
                        {action.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {commonFieldsErr.actionId && (
                <FieldError errors={[{ message: commonFieldsErr.actionId }]} />
              )}
            </Field>
          )}

          {commonFields.appId && commonFields.actionId && (
            <Field>
              <FieldLabel>Connection</FieldLabel>
              <ConnectBtn
                appId={commonFields.appId}
                stepType={StepType.ACTION}
                selectedConnectionId={commonFields.connectionId}
                onAuthSuccess={(id) => {
                  setCommonFields((prev) => ({
                    ...prev,
                    connectionId: id,
                  }));
                  setCommonFieldsErr((prev) => ({
                    ...prev,
                    connectionId: '',
                  }));
                }}
              />
              {commonFieldsErr.connectionId && (
                <FieldError
                  errors={[{ message: commonFieldsErr.connectionId }]}
                />
              )}
            </Field>
          )}

          {commonFields.appId &&
            commonFields.actionId &&
            dataAvailable &&
            Object.keys(dataAvailable).length > 0 && (
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    Data from previous step
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click to copy{' '}
                    <code className="text-xs font-mono text-primary">
                      {'{{key}}'}
                    </code>
                  </p>
                </div>

                <TooltipProvider>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(dataAvailable).map(([key, value]) => (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80 active:scale-95 transition-all flex items-center gap-1.5 pl-2.5 pr-2 py-1 text-sm group"
                            onClick={() => {
                              navigator.clipboard.writeText(`{{${value.id}}}`);
                              toast.success(`Copied {{ ${value.id} }}`);
                            }}
                          >
                            <span className="text-xs text-muted-foreground/90 max-w-40 truncate">
                              {value?.display || value.id}
                            </span>

                            <Copy className="h-3.5 w-3.5 opacity-40 group-hover:opacity-80 transition-opacity" />
                          </Badge>
                        </TooltipTrigger>

                        <TooltipContent side="top" className="text-xs max-w-xs">
                          Click to copy{' '}
                          <span className="font-mono">{`{{${value.id}}}`}</span>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </TooltipProvider>
              </div>
            )}

          {selectedAction && (
            <div className="mt-6 space-y-4">
              <div className="border-t pt-6">
                {selectedAction.fields && selectedAction.fields.length > 0 ? (
                  <>
                    <h3 className="mb-4 text-sm font-medium">
                      Action Configuration
                    </h3>
                    <DynamicForm
                      fields={selectedAction.fields}
                      onSubmit={onSubmit}
                      submitLabel="Add Action"
                      isLoading={isPending}
                      variables={variables}
                    />
                  </>
                ) : (
                  <Button
                    onClick={() => onSubmit({})}
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? 'Adding...' : 'Add Action'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ActionSheet;
