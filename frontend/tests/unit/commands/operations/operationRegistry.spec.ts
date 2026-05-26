import { describe, expect, it } from 'vitest';
import { deserializeOperation, getRegisteredOperationTypes, serializeOperation } from '@/commands/operations/OperationRegistry';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddGuide2DPerpendicularToLineOp } from '@/commands/operations/world/AddGuideOp';
import { AddIntersectionPoint2DOp } from '@/commands/operations/world/AddIntersectionPointOp';
import { UpdateElementStyleOp } from '@/commands/operations/world/UpdateElementStyleOp';
import { Vector3 } from 'three';

describe('OperationRegistry', () => {
  it('registers unique active operation descriptor types', () => {
    const types = getRegisteredOperationTypes();
    expect(types.length).toBeGreaterThan(20);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toContain('AddFreePoint2D');
    expect(types).toContain('AddGuide2DPerpendicularToLine');
    expect(types).toContain('PushSubprocess');
  });

  it('fails fast for unknown current-schema operation descriptors', () => {
    expect(() => deserializeOperation({ opType: 'UnknownOperationType' })).toThrow('Unknown operation type: UnknownOperationType');
  });

  it('round-trips descriptors through registered restore functions', () => {
    const descriptor = {
      opType: 'AddFreePoint2D',
      planeId: 'projPlane3',
      position: [1, 2, 1],
      pointId: 'projPlane3/point2d10'
    };
    const op = deserializeOperation(descriptor);
    expect(op.type).toBe('AddFreePoint2D');
    expect(serializeOperation(op)).toEqual(descriptor);
  });

  it('round-trips AddIntersectionPoint2D line identifiers and restored output state', () => {
    const descriptor = {
      opType: 'AddIntersectionPoint2D',
      planeId: 'projPlane3',
      line1Id: 'projPlane3/line2d4',
      line2Id: 'projPlane3/line2d5',
      pointId: 'projPlane3/point2d12'
    };

    const restored = deserializeOperation(descriptor);
    expect(restored.type).toBe('AddIntersectionPoint2D');
    expect(serializeOperation(restored)).toEqual(descriptor);

    const created = new AddIntersectionPoint2DOp(descriptor.planeId, descriptor.line1Id, descriptor.line2Id);
    created.outputs = { pointId: descriptor.pointId };
    expect(serializeOperation(created)).toEqual(descriptor);
  });



  it('round-trips UpdateElementStyle through its typed JSON payload', () => {
    const descriptor = {
      opType: 'UpdateElementStyle',
      payload: {
        elementId: 'projPlane3/line2d4',
        planeId: 'projPlane3',
        newStyle: {
          color: '#ff0000',
          lineWidth: 2,
          lineStyle: 'dashed',
          opacity: 0.5,
          visible: false
        }
      }
    };

    const restored = deserializeOperation(descriptor);
    expect(restored.type).toBe('UpdateElementStyle');
    expect(serializeOperation(restored)).toEqual(descriptor);

    const created = new UpdateElementStyleOp('projPlane3/line2d4', 'projPlane3', descriptor.payload.newStyle);
    expect(serializeOperation(created)).toEqual(descriptor);
  });

  it('persists AddGuide generated IDs from output state, not mutable parameters', () => {
    const op = new AddGuide2DPerpendicularToLineOp('projPlane3', 'line1', 'point1');
    op.outputs = { guideId: 'projPlane3/guide2d20' };
    expect(serializeOperation(op)).toEqual({
      opType: 'AddGuide2DPerpendicularToLine',
      planeId: 'projPlane3',
      referenceLineId: 'line1',
      throughPointId: 'point1',
      guideId: 'projPlane3/guide2d20'
    });
  });

  it('rejects non-serialized operations instead of falling back to parameter bags', () => {
    const op = new AddFreePoint2DOp('projPlane3', new Vector3(1, 2, 1));
    (op as { serialize?: unknown }).serialize = undefined;
    expect(() => serializeOperation(op)).toThrow('cannot be persisted without a descriptor serializer');
  });
});
