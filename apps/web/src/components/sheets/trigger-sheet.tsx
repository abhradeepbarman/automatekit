import { INITIAL_X, INITIAL_Y, NODE_SPACING } from '@/constants/workflow';
import stepService from '@/services/step.service';
import apps from '@repo/common/@apps';
import { StepType } from '@repo/common/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Edge, Node } from '@xyflow/react';
import { useState, type Dispatch, type SetStateAction } from 'react';
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

interface ITriggerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSelectedSourceNodeId: Dispatch<SetStateAction<string>>;
  setActionSheetOpen: Dispatch<SetStateAction<boolean>>;
  handleEditClick: () => void;
  handleDeleteClick: (nodeId: string) => void;
}

const TriggerSheet = ({
  open,
  onOpenChange,
  setNodes,
  setEdges,
  setSelectedSourceNodeId,
  setActionSheetOpen,
  handleEditClick,
  handleDeleteClick,
}: ITriggerSheetProps) => {
  const queryClient = useQueryClient();
  const { id: workflowId } = useParams();
  const [commonFields, setCommonFields] = useState({
    appId: '',
    triggerId: '',
    connectionId: '',
  });
  const [commonFieldsErr, setCommonFieldsErr] = useState({
    appId: '',
    triggerId: '',
    connectionId: '',
  });

  const clearFields = () => {
    setCommonFields({
      appId: '',
      triggerId: '',
      connectionId: '',
    });

    setCommonFieldsErr({
      appId: '',
      triggerId: '',
      connectionId: '',
    });
  };

  const { mutateAsync, isPending } = useMutation({
    mutationKey: ['create-trigger'],
    mutationFn: (metadata: Node) =>
      stepService.addStep(
        workflowId!,
        commonFields.appId,
        commonFields.triggerId,
        0,
        StepType.TRIGGER,
        commonFields.connectionId,
        metadata,
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['workflow', workflowId],
      });
    },
  });

  const onSubmit = async (fieldData: any) => {
    const { appId, triggerId, connectionId } = commonFields;

    if (!appId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        appId: 'App is required',
      }));
    if (!triggerId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        triggerId: 'Trigger is required',
      }));
    if (appDetails?.auth && !connectionId)
      return setCommonFieldsErr((prev) => ({
        ...prev,
        connectionId: 'Connection is required',
      }));

    const nodeDetails: Node = {
      id: '',
      type: 'triggerNode',
      position: { x: INITIAL_X, y: INITIAL_Y },
      data: {
        appId: commonFields.appId,
        triggerId: commonFields.triggerId,
        connectionId: commonFields.connectionId,
        index: 0,
        fields: fieldData || {},
      },
    };

    try {
      const newStepDetails = await mutateAsync(nodeDetails);
      const addActionButtonId = `add-action-${newStepDetails.metadata.id}`;

      setNodes((prev) => [
        ...prev.filter((n) => n.type !== 'addTriggerButton'),
        {
          ...newStepDetails.metadata,
          data: {
            ...newStepDetails.metadata.data,
            onEditClick: () => handleEditClick(),
            onDeleteClick: () => handleDeleteClick(newStepDetails.metadata.id),
          },
        },
        {
          id: addActionButtonId,
          type: 'addActionButton',
          position: { x: INITIAL_X + NODE_SPACING, y: INITIAL_Y },
          data: {
            onAddClick: () => {
              setSelectedSourceNodeId(newStepDetails.metadata.id);
              setActionSheetOpen(true);
            },
          },
        },
      ]);

      setEdges((prev) => [
        ...prev,
        {
          id: `${newStepDetails.metadata.id}-${addActionButtonId}`,
          source: newStepDetails.metadata.id,
          target: addActionButtonId,
        },
      ]);

      toast.success('Trigger added successfully', {
        description: 'The trigger has been added to your workflow.',
      });

      clearFields();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add trigger:', error);
      toast.error('Failed to add trigger', {
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred. Please try again.',
      });
    }
  };

  const appDetails = apps.find((app) => app.id === commonFields.appId);
  const triggerDetails = appDetails?.triggers?.find(
    (trigger) => trigger.id === commonFields.triggerId,
  );

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
          <SheetTitle>Add Trigger</SheetTitle>
          <SheetDescription>
            Configure a trigger to start your workflow automatically
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
                  triggerId: '',
                  connectionId: '',
                }));
                setCommonFieldsErr((prev) => ({
                  ...prev,
                  appId: '',
                  triggerId: '',
                  connectionId: '',
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an app" />
              </SelectTrigger>
              <SelectContent>
                {apps
                  .filter((app) => app.triggers && app.triggers.length > 0)
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
              <FieldLabel>Trigger</FieldLabel>
              <Select
                value={commonFields.triggerId}
                onValueChange={(val) => {
                  setCommonFields((prev) => ({
                    ...prev,
                    triggerId: val,
                  }));
                  setCommonFieldsErr((prev) => ({
                    ...prev,
                    triggerId: '',
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a trigger" />
                </SelectTrigger>
                <SelectContent>
                  {apps
                    .find((app) => app.id === commonFields.appId)
                    ?.triggers?.map((trigger) => (
                      <SelectItem key={trigger.id} value={trigger.id}>
                        {trigger.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {commonFieldsErr.triggerId && (
                <FieldError errors={[{ message: commonFieldsErr.triggerId }]} />
              )}
            </Field>
          )}

          {appDetails?.auth && (
            <Field>
              <FieldLabel>Connection</FieldLabel>
              <ConnectBtn
                appId={commonFields.appId}
                stepType={StepType.TRIGGER}
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

          {appDetails && triggerDetails && (
            <div className="mt-6 space-y-4">
              <div className="border-t pt-6">
                {triggerDetails.fields && triggerDetails.fields.length > 0 ? (
                  <>
                    <h3 className="mb-4 text-sm font-medium">
                      Trigger Configuration
                    </h3>
                    <DynamicForm
                      fields={triggerDetails.fields}
                      onSubmit={onSubmit}
                      submitLabel="Add Trigger"
                      isLoading={isPending}
                    />
                  </>
                ) : (
                  <Button
                    onClick={() => onSubmit({})}
                    disabled={isPending}
                    className="w-full"
                  >
                    {isPending ? 'Adding...' : 'Add Trigger'}
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

export default TriggerSheet;
