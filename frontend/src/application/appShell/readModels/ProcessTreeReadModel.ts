import type { ProcessNodeSnapshot, ProcessTree } from '@/domain/processTree/ProcessTree';
import { Element2D } from '@/domain/world/Element2D';
import type { World } from '@/domain/world/World';
import { GeometryElementLookup } from '@/domain/world/GeometryElementLookup';
import type { DependencyQueryPort } from '@/domain/world/DependencyPorts';
import type { DescriptorRegistry } from '@/application/processTree/descriptors/DescriptorRegistry';
import type { DescriptionPart } from '@/application/processTree/descriptors/DescriptionPart';
import type { Action } from '@/domain/processTree/Action';
import { mapDescriptionParts, type ProcessNodeViewModel, type ProcessTreeReadModel } from '../RuntimeViewPorts';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';
import type { CachedProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';

export interface ProcessTreeReadModelContext {
  readonly world: World;
  readonly processTree: ProcessTree;
  readonly dependencyQuery: DependencyQueryPort;
  readonly descriptorRegistry: DescriptorRegistry;
  readonly visibilityModel: VisibilityModel;
  readonly realizationContext: CachedProjectionElementRealizationContext & Element3DRealizationContext;
}

export function buildProcessTreeReadModel(context: ProcessTreeReadModelContext): ProcessTreeReadModel {
  const tree = context.processTree;
  return {
    root: createProcessNodeViewModel(tree.getRootSnapshot(), context),
    activeSubprocessId: tree.getCurrentSubprocess().id,
  };
}

export function getRelatedActionIds(selectedIds: readonly string[], context: ProcessTreeReadModelContext): Set<string> {
  const related = new Set<string>();
  const selectedIdSet = new Set(selectedIds);
  for (const action of context.processTree.getAllActions()) {
    const producesSelected = selectedIdSet.has(action.elementId);
    const dependsOnSelected = context.dependencyQuery.getDependencies(action.elementId).some(depId => selectedIdSet.has(depId));
    if (producesSelected || dependsOnSelected) related.add(action.id);
  }
  return related;
}

export function countProcessNodeViewModels(node: ProcessNodeViewModel): number {
  return 1 + (node.children?.reduce((sum, child) => sum + countProcessNodeViewModels(child), 0) ?? 0);
}

function createProcessNodeViewModel(node: ProcessNodeSnapshot, context: ProcessTreeReadModelContext): ProcessNodeViewModel {
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
    children: node.children.map(child => createProcessNodeViewModel(child, context)),
    showIntermediates: node.type === 'subprocess' ? visibility.showIntermediates === true : undefined,
    isOutput: visibility.isOutput === true,
    isAuxiliary: node.type === 'actionGroup' ? visibility.isAuxiliary === true : undefined,
    descriptionParts: [],
    isInfeasible: false,
    hideBecauseElementMissing: false,
  };
}

function isActionInfeasible(elementId: string, context: ProcessTreeReadModelContext): boolean {
  const lookup = new GeometryElementLookup(context.world);
  if (!elementId.includes('/')) {
    const element = lookup.getElement3DById(elementId) || context.world.getProjectionPlaneById(elementId);
    if (!element) throw new Error(`Process action references missing element: ${elementId}`);
    return false;
  }

  const element = lookup.getElement2D(elementId);
  if (!element) throw new Error(`Process action references missing 2D element: ${elementId}`);
  if (element instanceof Element2D) {
    const realization = element.realize2D(context.realizationContext);
    return !realization.isFeasible();
  }
  return false;
}

function getActionDescriptionParts(action: Action, context: ProcessTreeReadModelContext): DescriptionPart[] {
  const { descriptorRegistry, world } = context;
  const lookup = new GeometryElementLookup(world);
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
  
  if (action.elementId.includes('/')) {
    const element = lookup.getElement2D(action.elementId);
    if (!element) throw new Error(`Process action references missing 2D element: ${action.elementId}`);
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
  
  const element3d = lookup.getElement3DById(action.elementId);
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
  
  throw new Error(`Process action references missing element: ${action.elementId}`);
}
