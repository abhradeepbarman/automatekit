import type { ExecutionStatus, StepType } from '@repo/common/types';
import { createContext, useContext } from 'react';

export interface StepData extends Record<string, unknown> {
  type: StepType;
  integration: string;
  eventName: string;
  connectionId: string | null;
  config: Record<string, unknown>;
  webhook?: { method: string; url: string } | null;
}

interface EditorContextValue {
  workflowId: string;
  isDirty: boolean;
  runStatus: Record<string, ExecutionStatus>;
  addAction: (sourceId: string) => void;
  editStep: (id: string) => void;
  deleteStep: (id: string) => void;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used inside EditorContext');
  return context;
};
