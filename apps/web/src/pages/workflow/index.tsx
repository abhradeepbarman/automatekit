import StepNode from '@/components/nodes/step-node';
import LogsSheet from '@/components/sheets/logs-sheet';
import StepSheet from '@/components/sheets/step-sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  EditorContext,
  type StepData,
} from '@/components/workflow/editor-context';
import WorkflowTitle from '@/components/workflow/workflow-title';
import { useFindEvent } from '@/hooks/use-integrations';
import workflowService, {
  type IExecution,
  type IWorkflowDetails,
} from '@/services/workflow.service';
import { ExecutionStatus, StepType } from '@repo/common/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  MarkerType,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { AxiosError } from 'axios';
import {
  ArrowLeft,
  Check,
  History,
  LoaderCircle,
  Plus,
  Save,
  Zap,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

type StepNodeType = Node<StepData, 'step'>;
const nodeTypes = { step: StepNode };

const defaultEdgeOptions = {
  type: 'smoothstep',
  pathOptions: { borderRadius: 16 },
  style: { strokeWidth: 2, stroke: 'var(--muted-foreground)' },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 16,
    height: 16,
    color: 'var(--muted-foreground)',
  },
};

const toGraph = (workflow: IWorkflowDetails) => ({
  nodes: workflow.steps.map<StepNodeType>((step) => ({
    id: step.id,
    type: 'step',
    position: step.position,
    data: {
      type: step.type,
      integration: step.integration,
      eventName: step.eventName,
      connectionId: step.connectionId,
      config: step.config,
      webhook: step.webhook,
    },
  })),
  edges: workflow.edges.map<Edge>((edge) => ({
    id: `${edge.source}-${edge.target}`,
    ...edge,
  })),
});

type SheetState =
  | { mode: 'add-trigger' }
  | { mode: 'add-action'; sourceId: string }
  | { mode: 'edit'; stepId: string }
  | null;

export default function Workflow() {
  const navigate = useNavigate();
  const { id: workflowId } = useParams() as { id: string };
  const queryClient = useQueryClient();
  const findEvent = useFindEvent();

  const [nodes, setNodes] = useState<StepNodeType[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<IExecution | null>(null);
  const [loadedId, setLoadedId] = useState<string>();

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowService.getWorkflow(workflowId),
  });

  const loadGraph = (details: IWorkflowDetails) => {
    const graph = toGraph(details);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setIsDirty(false);
  };

  if (workflow && workflow.id !== loadedId) {
    setLoadedId(workflow.id);
    loadGraph(workflow);
  }

  const showError =
    (title: string) => (error: AxiosError<{ message: string }>) =>
      toast.error(title, { description: error.response?.data?.message });

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () =>
      workflowService.saveSteps(workflowId, {
        steps: nodes.map((node) => ({
          id: node.id,
          type: node.data.type,
          integration: node.data.integration,
          eventName: node.data.eventName,
          connectionId: node.data.connectionId,
          config: node.data.config,
          position: node.position,
        })),
        edges: edges.map(({ source, target }) => ({ source, target })),
      }),
    onSuccess: (saved) => {
      loadGraph(saved);
      queryClient.setQueryData(['workflow', workflowId], saved);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success('Workflow saved');
    },
    onError: showError("Couldn't save workflow"),
  });

  const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: (isActive: boolean) =>
      workflowService.updateWorkflow(workflowId, undefined, isActive),
    onSuccess: (_, isActive) => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      toast.success(isActive ? 'Workflow is live' : 'Workflow paused', {
        description: isActive
          ? 'It will run whenever its trigger fires.'
          : 'It will not run until you activate it again.',
      });
    },
    onError: (error: AxiosError<{ message: string }>, isActive) =>
      showError(
        isActive ? "Couldn't activate workflow" : "Couldn't pause workflow",
      )(error),
  });

  const onNodesChange = useCallback((changes: NodeChange<StepNodeType>[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
    if (changes.some((c) => c.type === 'position' && !c.dragging)) {
      setIsDirty(true);
    }
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((current) => applyEdgeChanges(changes, current));
    if (changes.some((c) => c.type === 'remove')) setIsDirty(true);
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge(connection, current));
    setIsDirty(true);
  }, []);

  const findNode = (id: string) => nodes.find((node) => node.id === id);

  const getDataAvailable = (stepId?: string) => {
    const step = stepId && findNode(stepId);
    return step
      ? findEvent(step.data.integration, step.data.type, step.data.eventName)
          .event?.dataAvailable
      : undefined;
  };

  const saveStep = (data: StepData) => {
    setIsDirty(true);

    if (sheet?.mode === 'edit') {
      setNodes((current) =>
        current.map((node) =>
          node.id === sheet.stepId
            ? { ...node, data: { ...node.data, ...data } }
            : node,
        ),
      );
      return;
    }

    const id = crypto.randomUUID();
    const source =
      sheet?.mode === 'add-action' ? findNode(sheet.sourceId) : undefined;
    const siblings = edges.filter((e) => e.source === source?.id).length;

    setNodes((current) => [
      ...current,
      {
        id,
        type: 'step',
        data,
        position: source
          ? {
              x: source.position.x + 340,
              y: source.position.y + siblings * 160,
            }
          : { x: 100, y: 100 },
      },
    ]);
    if (source) {
      setEdges((current) => [
        ...current,
        { id: `${source.id}-${id}`, source: source.id, target: id },
      ]);
    }
  };

  const editor = useMemo(
    () => ({
      workflowId,
      isDirty,
      runStatus: Object.fromEntries(
        (selectedRun?.steps ?? []).flatMap((step) =>
          step.stepId ? [[step.stepId, step.status]] : [],
        ),
      ) as Record<string, ExecutionStatus>,
      addAction: (sourceId: string) =>
        setSheet({ mode: 'add-action', sourceId }),
      editStep: (stepId: string) => setSheet({ mode: 'edit', stepId }),
      deleteStep: (stepId: string) => {
        setNodes((current) => current.filter((node) => node.id !== stepId));
        setEdges((current) =>
          current.filter((e) => e.source !== stepId && e.target !== stepId),
        );
        setIsDirty(true);
      },
    }),
    [workflowId, isDirty, selectedRun],
  );

  const editing = sheet?.mode === 'edit' ? findNode(sheet.stepId) : undefined;
  const parentId =
    sheet?.mode === 'add-action'
      ? sheet.sourceId
      : editing && edges.find((e) => e.target === editing.id)?.source;
  const canActivate = workflow ? workflow.steps.length >= 2 : false;
  const switchHint = isDirty
    ? 'Save your changes first'
    : workflow?.isActive
      ? 'Pause workflow'
      : canActivate
        ? 'Activate workflow'
        : 'Add a trigger and at least one action to activate';
  const hasTrigger = nodes.some((node) => node.data.type === StepType.TRIGGER);

  if (isLoading || !workflow) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorContext.Provider value={editor}>
      <div className="flex h-screen w-screen flex-col">
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            className="shadow-sm"
            title="Back to dashboard"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute top-4 left-1/2 z-10 flex max-w-md -translate-x-1/2 items-center gap-2 rounded-lg border bg-background/90 p-1 pr-3 shadow-sm backdrop-blur">
          <WorkflowTitle workflowId={workflow.id} name={workflow.name} />
          <span className="h-5 w-px shrink-0 bg-border" />
          <span title={switchHint}>
            <Switch
              aria-label={switchHint}
              checked={workflow.isActive}
              onCheckedChange={toggleActive}
              disabled={
                isToggling || isDirty || (!workflow.isActive && !canActivate)
              }
            />
          </span>
        </div>

        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shadow-sm"
            onClick={() => setLogsOpen(true)}
          >
            <History className="h-4 w-4" />
            Executions
          </Button>
          {isDirty ? (
            <Button
              size="sm"
              className="relative gap-2 shadow-sm"
              onClick={() => save()}
              disabled={isSaving}
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-background bg-amber-500" />
            </Button>
          ) : (
            <span className="flex h-8 items-center gap-1.5 px-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-emerald-500" />
              Saved
            </span>
          )}
        </div>

        {!hasTrigger && (
          <div className="absolute top-1/2 left-1/2 z-10 flex w-72 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-xl border bg-background p-6 text-center shadow-sm">
            <div className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
              <Zap className="size-5 fill-current" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">Start with a trigger</p>
              <p className="text-sm text-muted-foreground">
                Choose what kicks off this workflow.
              </p>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => setSheet({ mode: 'add-trigger' })}
            >
              <Plus className="h-4 w-4" />
              Add trigger
            </Button>
          </div>
        )}

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            deleteKeyCode={null}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionLineStyle={{ strokeWidth: 2 }}
            fitView
            fitViewOptions={{ maxZoom: 1 }}
            className="bg-muted/40"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.2}
              color="var(--border)"
            />
            <Controls
              showInteractive={false}
              className="overflow-hidden rounded-lg border bg-background shadow-sm"
            />
          </ReactFlow>
        </div>

        <StepSheet
          open={!!sheet}
          onOpenChange={(open) => !open && setSheet(null)}
          type={
            sheet?.mode === 'add-trigger' ||
            editing?.data.type === StepType.TRIGGER
              ? StepType.TRIGGER
              : StepType.ACTION
          }
          initial={editing?.data}
          dataAvailable={getDataAvailable(parentId)}
          onSubmit={saveStep}
        />

        <LogsSheet
          open={logsOpen}
          onOpenChange={setLogsOpen}
          selectedId={selectedRun?.id}
          onSelect={setSelectedRun}
        />
      </div>
    </EditorContext.Provider>
  );
}
