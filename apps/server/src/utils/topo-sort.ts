import { StepType } from '@repo/common/types';
import CustomErrorHandler from './custom-error-handler';

interface GraphStep {
  id: string;
  type: StepType;
}

interface GraphEdge {
  source: string;
  target: string;
}

export const topoSort = (steps: GraphStep[], edges: GraphEdge[]) => {
  const fail = (message: string) => {
    throw CustomErrorHandler.badRequest(message);
  };

  const typeById = new Map(steps.map((step) => [step.id, step.type]));
  if (typeById.size !== steps.length) fail('Duplicate step ids');

  const triggers = steps.filter((step) => step.type === StepType.TRIGGER);
  if (steps.length > 0 && triggers.length !== 1) {
    fail('A workflow must have exactly one trigger');
  }

  const inDegree = new Map(steps.map((step) => [step.id, 0]));
  const children = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const { source, target } of edges) {
    if (!typeById.has(source) || !typeById.has(target)) {
      fail('A connection points to a step that does not exist');
    }
    if (source === target) fail('A step cannot connect to itself');
    if (typeById.get(target) === StepType.TRIGGER) {
      fail('Nothing can connect into the trigger');
    }
    const key = `${source}:${target}`;
    if (seen.has(key)) fail('Duplicate connection between two steps');
    seen.add(key);

    inDegree.set(target, inDegree.get(target)! + 1);
    children.set(source, [...(children.get(source) ?? []), target]);
  }

  for (const step of steps) {
    if (step.type === StepType.ACTION && inDegree.get(step.id) === 0) {
      fail('Every action must be connected to a previous step');
    }
  }

  const queue = triggers.map((step) => step.id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const child of children.get(id) ?? []) {
      inDegree.set(child, inDegree.get(child)! - 1);
      if (inDegree.get(child) === 0) queue.push(child);
    }
  }

  if (order.length !== steps.length) fail('The workflow contains a loop');
  return order;
};
