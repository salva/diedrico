import { getActionDescriptionParts } from '@/domain/processTree/Action';
import type { ProcessNode } from '@/domain/processTree/ProcessTree';
import { Element2D } from '@/domain/world/Element2D';
import type { World } from '@/domain/world/World';
import { mapDescriptionParts, type ProcessNodeViewModel, type ProcessTreeReadModel } from '../RuntimeViewPorts';

export interface ProcessTreeReadModelContext {
  readonly world: World;
}

export function buildProcessTreeReadModel(context: ProcessTreeReadModelContext): ProcessTreeReadModel {
  const tree = context.world.getProcessTree();
  return {
    root: createProcessNodeViewModel(tree.root, context),
    version: tree.getVersion(),
    activeSubprocessId: tree.getCurrentSubprocess().id,
  };
}

export function getRelatedActionIds(selectedIds: readonly string[], context: ProcessTreeReadModelContext): Set<string> {
  const related = new Set<string>();
  const selectedIdSet = new Set(selectedIds);
  for (const action of context.world.getProcessTree().getAllActions()) {
    const producesSelected = selectedIdSet.has(action.elementId);
    const dependsOnSelected = context.world.getDependencyService().getDependencies(action.elementId).some(depId => selectedIdSet.has(depId));
    if (producesSelected || dependsOnSelected) related.add(action.id);
  }
  return related;
}

export function countProcessNodeViewModels(node: ProcessNodeViewModel): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countProcessNodeViewModels(child), 0) ?? 0);
}

function createProcessNodeViewModel(node: ProcessNode, context: ProcessTreeReadModelContext): ProcessNodeViewModel {
  if (node.type === 'action') {
    const descriptionParts = mapDescriptionParts(getActionDescriptionParts(node, context.world));
    return {
      id: node.id,
      type: node.type,
      isOutput: node.isOutput,
      elementId: node.elementId,
      descriptionParts,
      isInfeasible: isActionInfeasible(node.elementId, context),
      hideBecauseElementMissing: descriptionParts.length === 0,
    };
  }
  return {
    id: node.id,
    type: node.type,
    name: node.type === 'subprocess' ? node.name : undefined,
    children: node.children.filter(child => child !== null).map(child => createProcessNodeViewModel(child, context)),
    showIntermediates: node.type === 'subprocess' ? node.showIntermediates : undefined,
    isOutput: node.isOutput,
    isAuxiliary: node.type === 'actionGroup' ? node.isAuxiliary : undefined,
    descriptionParts: [],
    isInfeasible: false,
    hideBecauseElementMissing: false,
  };
}

function isActionInfeasible(elementId: string, context: ProcessTreeReadModelContext): boolean {
  let element;
  try {
    element = context.world.getElement2D(elementId);
  } catch {
    element = context.world.getElement3DById(elementId) || context.world.getProjectionPlaneById(elementId);
  }
  if (element instanceof Element2D) {
    const realization = element.realize2D(context.world);
    return realization ? !realization.isFeasible() : false;
  }
  return false;
}
