import type { ProcessNode } from '@/domain/processTree/ProcessTree';
import { Element2D } from '@/domain/world/Element2D';
import type { World } from '@/domain/world/World';
import type { DependencyQueryPort } from '@/domain/world/DependencyPorts';
import type { DescriptorRegistry } from '@/domain/world/descriptors/DescriptorRegistry';
import type { DescriptionPart } from '@/domain/world/descriptors/DescriptionPart';
import type { Action } from '@/domain/processTree/Action';
import { mapDescriptionParts, type ProcessNodeViewModel, type ProcessTreeReadModel } from '../RuntimeViewPorts';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';

export interface ProcessTreeReadModelContext {
  readonly world: World;
  readonly dependencyQuery: DependencyQueryPort;
  readonly descriptorRegistry: DescriptorRegistry;
  readonly visibilityModel: VisibilityModel;
}

export function buildProcessTreeReadModel(context: ProcessTreeReadModelContext): ProcessTreeReadModel {
  const tree = context.world.getProcessTree();
  return {
    root: createProcessNodeViewModel(tree.root, context),
    activeSubprocessId: tree.getCurrentSubprocess().id,
  };
}

export function getRelatedActionIds(selectedIds: readonly string[], context: ProcessTreeReadModelContext): Set<string> {
  const related = new Set<string>();
  const selectedIdSet = new Set(selectedIds);
  for (const action of context.world.getProcessTree().getAllActions()) {
    const producesSelected = selectedIdSet.has(action.elementId);
    const dependsOnSelected = context.dependencyQuery.getDependencies(action.elementId).some(depId => selectedIdSet.has(depId));
    if (producesSelected || dependsOnSelected) related.add(action.id);
  }
  return related;
}

export function countProcessNodeViewModels(node: ProcessNodeViewModel): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countProcessNodeViewModels(child), 0) ?? 0);
}

function createProcessNodeViewModel(node: ProcessNode, context: ProcessTreeReadModelContext): ProcessNodeViewModel {
  const visibility = context.visibilityModel.get(node.id, node.type);
  if (node.type === 'action') {
    const descriptionParts = mapDescriptionParts(getActionDescriptionParts(node, context));
    return {
      id: node.id,
      type: node.type,
      isOutput: visibility.isOutput === true,
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
    showIntermediates: node.type === 'subprocess' ? visibility.showIntermediates === true : undefined,
    isOutput: visibility.isOutput === true,
    isAuxiliary: node.type === 'actionGroup' ? visibility.isAuxiliary === true : undefined,
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

function getActionDescriptionParts(action: Action, context: ProcessTreeReadModelContext): DescriptionPart[] {
  const { descriptorRegistry, world } = context;
  if (!action.elementId.includes('/')) {
    const plane = world.getProjectionPlaneById(action.elementId);
    if (plane) {
      const descriptor = descriptorRegistry.get(plane);
      const typeName = descriptor.getTypeName(plane).toLowerCase();
      const label = plane.label || plane.name;
      const constructionParts = descriptor.getConstructionDescription(plane, world);
      
      return [
        { type: 'label', content: label, elementId: action.elementId },
        { type: 'text', content: `: ${typeName} ` },
        ...constructionParts
      ];
    }
  }
  
  try {
    const element = world.getElement2D(action.elementId);
    if (element) {
      const descriptor = descriptorRegistry.get(element);
      const typeName = descriptor.getTypeName(element).toLowerCase();
      const label = element.label || action.elementId;
      const constructionParts = descriptor.getConstructionDescription(element, world);
      
      return [
        { type: 'label', content: label, elementId: action.elementId },
        { type: 'text', content: `: ${typeName} ` },
        ...constructionParts
      ];
    }
  } catch {
    // Not a 2D element, continue to 3D
  }
  
  const element3d = world.getElement3DById(action.elementId);
  if (element3d) {
    const descriptor = descriptorRegistry.get(element3d);
    const typeName = descriptor.getTypeName(element3d).toLowerCase();
    const label = element3d.label || action.elementId;
    const constructionParts = descriptor.getConstructionDescription(element3d, world);
    
    return [
      { type: 'label', content: label, elementId: action.elementId },
      { type: 'text', content: `: ${typeName} ` },
      ...constructionParts
    ];
  }
  
  return [];
}
