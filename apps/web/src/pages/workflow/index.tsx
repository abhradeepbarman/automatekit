import DeleteConfirmationDialog from '@/components/dialog/delete-confirmation-dialog';
import ActionNode from '@/components/nodes/action-node';
import AddActionButtonNode from '@/components/nodes/add-action-button-node';
import AddTriggerButtonNode from '@/components/nodes/add-trigger-button-node';
import TriggerNode from '@/components/nodes/trigger-node';
import ActionSheet from '@/components/sheets/action-sheet';
import WorkflowTitle from '@/components/workflow/workflow-title';
import LogsSheet from '@/components/sheets/logs-sheet';
import TriggerSheet from '@/components/sheets/trigger-sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { INITIAL_X, INITIAL_Y, NODE_SPACING } from '@/constants/workflow';
import { useIntegrations } from '@/hooks/use-integrations';
import stepService from '@/services/step.service';
import workflowService from '@/services/workflow.service';
import { StepType } from '@repo/common/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AxiosError } from 'axios';
import { ArrowLeft, FileText } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const nodeTypes = {
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  addTriggerButton: AddTriggerButtonNode,
  addActionButton: AddActionButtonNode,
};

export default function Workflow() {
  const navigate = useNavigate();
  const { id: workflowId } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryFn: () => workflowService.getWorkflow(workflowId!),
    queryKey: ['workflow', workflowId],
  });

  const { data: integrations } = useIntegrations();

  const { mutate: updateStep } = useMutation({
    mutationFn: ({
      stepId,
      integration,
      connectionId,
      metadata,
    }: {
      stepId: string;
      integration?: string;
      connectionId?: string;
      metadata?: any;
    }) =>
      stepService.updateStep({ stepId, integration, connectionId, metadata }),
  });

  const { mutate: toggleWorkflowStatus, isPending: isStatusPending } =
    useMutation({
      mutationFn: (newIsActive: boolean) =>
        workflowService.updateWorkflow(workflowId!, undefined, newIsActive),
      onSuccess: (_, newIsActive) => {
        queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
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

  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'add-trigger-initial',
      type: 'addTriggerButton',
      position: { x: INITIAL_X, y: INITIAL_Y },
      data: {
        onAddClick: () => setTriggerSheetOpen(true),
      },
    },
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [logsSheetOpen, setLogsSheetOpen] = useState(false);
  const [selectedSourceNodeId, setSelectedSourceNodeId] = useState<string>('');
  const [nodeIdToDelete, setNodeIdToDelete] = useState<string | null>(null);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((prevNodes) => {
        const updatedNodes = applyNodeChanges(changes, prevNodes);

        if (
          changes.length === 1 &&
          changes[0].type === 'position' &&
          changes[0].dragging === false
        ) {
          const change = changes[0];

          const updatedNode = updatedNodes.find((n) => n.id === change.id);
          if (!updatedNode) return updatedNodes;

          updateStep({
            stepId: change.id,
            metadata: {
              id: change.id,
              type: updatedNode.type,
              data: updatedNode.data,
              position: {
                x: change.position?.x ?? updatedNode.position.x,
                y: change.position?.y ?? updatedNode.position.y,
              },
            },
          });
        }

        return updatedNodes;
      });
    },
    [updateStep, setNodes],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) =>
      setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [setEdges],
  );
  const handleDeleteClick = (nodeId: string) => {
    setNodeIdToDelete(nodeId);
  };

  useEffect(() => {
    if (data && data?.steps.length > 0) {
      const lastStep = data.steps[data.steps.length - 1];
      const addActionButtonId = `add-action-${lastStep.id}`;

      setNodes([
        ...data.steps.map((step) => {
          return {
            ...step.metadata,
            id: step.id,
            data: {
              ...step.metadata.data,
              onDeleteClick: () => handleDeleteClick(step.id),
            },
            position: {
              x: step.metadata.position?.x || INITIAL_X,
              y: step.metadata.position?.y || INITIAL_Y,
            },
          };
        }),
        {
          id: addActionButtonId,
          type: 'addActionButton',
          position: {
            x: (lastStep.metadata.position?.x || INITIAL_X) + NODE_SPACING,
            y: lastStep.metadata.position?.y || INITIAL_Y,
          },
          data: {
            onAddClick: () => {
              setSelectedSourceNodeId(lastStep.id);
              setActionSheetOpen(true);
            },
          },
        },
      ]);

      const edgesArr: Edge[] = [];
      data.steps.forEach((step, i) => {
        if (i < data.steps.length - 1) {
          edgesArr.push({
            id: `${step.id}-${data.steps[i + 1].id}`,
            source: step.id,
            target: data.steps[i + 1].id,
          });
        }
      });

      setEdges([
        ...edgesArr,
        {
          id: `${lastStep.id}-${addActionButtonId}`,
          source: lastStep.id,
          target: addActionButtonId,
        },
      ]);
    }
  }, [data]);

  const dataAvailable = useMemo(() => {
    const stepDetails = data?.steps.find(
      (step) => step.id === selectedSourceNodeId,
    );
    if (!stepDetails) return undefined;
    const appDetails = integrations?.find(
      (app) => app.id === stepDetails.integration,
    );
    if (stepDetails.type === StepType.TRIGGER) {
      return appDetails?.triggers.find((t) => t.id === stepDetails.eventName)
        ?.dataAvailable;
    }
    return appDetails?.actions.find((a) => a.id === stepDetails.eventName)
      ?.dataAvailable;
  }, [selectedSourceNodeId, data?.steps, integrations]);

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="absolute top-4 left-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {data && (
        <div className="absolute top-4 left-1/2 z-10 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-md border bg-background/80 p-1 pr-3 backdrop-blur-sm">
          <WorkflowTitle workflowId={data.id} name={data.name} />
          <span className="h-5 w-px shrink-0 bg-border" />
          <Switch
            title={data.isActive ? 'Deactivate workflow' : 'Activate workflow'}
            aria-label={
              data.isActive ? 'Deactivate workflow' : 'Activate workflow'
            }
            checked={data.isActive}
            onCheckedChange={toggleWorkflowStatus}
            disabled={isStatusPending}
          />
        </div>
      )}

      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLogsSheetOpen(true)}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Executions
        </Button>
      </div>

      {/* Workflow Canvas */}
      <div className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">
                Loading workflow...
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <MiniMap />
            <Background />
            <Controls />
          </ReactFlow>
        )}
      </div>

      <TriggerSheet
        open={triggerSheetOpen}
        onOpenChange={setTriggerSheetOpen}
        setNodes={setNodes}
        setEdges={setEdges}
        setSelectedSourceNodeId={setSelectedSourceNodeId}
        setActionSheetOpen={setActionSheetOpen}
        handleDeleteClick={handleDeleteClick}
      />

      <ActionSheet
        open={actionSheetOpen}
        onOpenChange={setActionSheetOpen}
        nodes={nodes}
        setNodes={setNodes}
        setEdges={setEdges}
        sourceNodeId={selectedSourceNodeId}
        setSelectedSourceNodeId={setSelectedSourceNodeId}
        setActionSheetOpen={setActionSheetOpen}
        handleDeleteClick={handleDeleteClick}
        dataAvailable={dataAvailable}
      />

      <DeleteConfirmationDialog
        open={!!nodeIdToDelete}
        onOpenChange={(open) => !open && setNodeIdToDelete(null)}
        nodeIdToDelete={nodeIdToDelete}
        nodes={nodes}
        edges={edges}
        setNodes={setNodes}
        setEdges={setEdges}
        setSelectedSourceNodeId={setSelectedSourceNodeId}
        setActionSheetOpen={setActionSheetOpen}
        setTriggerSheetOpen={setTriggerSheetOpen}
      />

      <LogsSheet open={logsSheetOpen} onOpenChange={setLogsSheetOpen} />
    </div>
  );
}
