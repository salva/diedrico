import type { ArgumentValue, CollectionContext, ValidationResult } from '@/tools/ToolArgumentCollector';

export function validateDistinctProjectionPlanes(
  args: Map<string, ArgumentValue>,
  context: CollectionContext,
  firstArgumentName: string,
  secondArgumentName: string,
  samePlaneError: string,
): ValidationResult {
  const first = args.get(firstArgumentName);
  const second = args.get(secondArgumentName);
  const firstPlaneId = first?.element?.planeId;
  const secondPlaneId = second?.element?.planeId;

  if (!firstPlaneId || !secondPlaneId) {
    return { valid: false, error: 'Missing projection plane information' };
  }

  if (!context.readPort.getProjectionPlaneById(firstPlaneId) || !context.readPort.getProjectionPlaneById(secondPlaneId)) {
    return { valid: false, error: 'One or both projection planes not found' };
  }

  if (!context.readPort.areProjectionPlanesDistinct(firstPlaneId, secondPlaneId)) {
    return { valid: false, error: samePlaneError };
  }

  return { valid: true };
}
