import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';
import { RuntimeDomainContext } from '@/application/appShell/RuntimeDomainContext';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { AddLine2DByTwoPointsOp, AddLine2DParallelToLineOp, AddLine2DPerpendicularToLineOp, AddLine2DByPointAndRelativeAngleOp, AddLine2DTangentToCircleThroughPointOp, AddLine2DTangentToCircleParallelToLineOp } from '@/commands/operations/world/AddLineOp';
import { AddSegment2DByPointsOp } from '@/commands/operations/world/AddSegmentOp';
import { AddCircle2DByCenterAndPointOp, AddCircle2DByCenterAndRadiusVectorOp } from '@/commands/operations/world/AddCircleOp';
import { AddLineLineIntersectionPoint2DOp } from '@/commands/operations/world/AddLineLineIntersectionPoint2DOp';
import { AddLineCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddLineCircleIntersectionPoint2DOp';
import { AddCircleCircleIntersectionPoint2DOp } from '@/commands/operations/world/AddCircleCircleIntersectionPoint2DOp';
import { AddGuide2DPerpendicularToLineOp } from '@/commands/operations/world/AddGuideOp';
import { Add3DPointOp } from '@/commands/operations/world/Add3DPointOp';
import { Add3DLineOp } from '@/commands/operations/world/Add3DLineOp';
import { Add3DSegmentOp } from '@/commands/operations/world/Add3DSegmentOp';
import { executeConstructionIntent } from '@/application/construction/ConstructionUseCases';
import type { IOperation } from '@/commands/operations/IOperation';

const categories = ['Point2D', 'Line2D', 'Circle2D', 'Guide2D', 'ProjectionPlane', 'HingeLine'];
function internals(session: RuntimeSession) {
  return session as unknown as { domain: RuntimeDomainContext; commandProducer: RuntimeCommandProducer };
}
function identity(session: RuntimeSession) {
  const { world } = internals(session).domain;
  return [...world.getAllProjectionPlanes().flatMap(p => [p, ...p.getAllPoints(), ...p.getAllLines(), ...p.getAllCircles()]),
    ...world.getAllPlanes(), ...world.getAllHingeLines(), ...world.getAll3DPoints(), ...world.getAll3DLines(), ...world.getAll3DSegments()]
    .map(e => [e.id, e.label]).sort(([a], [b]) => String(a).localeCompare(String(b)));
}
function counts(session: RuntimeSession) {
  return categories.map(type => internals(session).domain.labelGenerator.getCount(type));
}
function fixture() {
  const session = new RuntimeSession(); session.initializeDefaultWorldIfNeeded();
  const { domain, commandProducer: producer } = internals(session);
  const [h, v] = domain.world.getAllProjectionPlanes();
  function add(op: IOperation) {
    let outputs = op.outputs;
    producer.executeToolCommand(op.type, cmd => { outputs = cmd.addAndExecute(op).outputs; });
    return outputs;
  }
  const point = (plane: string, x: number, y: number) => add(new AddFreePoint2DOp(plane, new Vector3(x, y, 1))).pointId!;
  const a = point(h.id, 0, 0), b = point(h.id, 10, 0), c = point(h.id, 0, 10);
  const av = point(v.id, 0, 0), bv = point(v.id, 10, 0);
  const l = add(new AddLine2DByTwoPointsOp(h.id, a, b)).lineId!;
  const l2 = add(new AddLine2DByTwoPointsOp(h.id, a, c)).lineId!;
  const lv = add(new AddLine2DByTwoPointsOp(v.id, av, bv)).lineId!;
  const s = add(new AddSegment2DByPointsOp(h.id, a, b)).segmentId!;
  const sv = add(new AddSegment2DByPointsOp(v.id, av, bv)).segmentId!;
  const circle = add(new AddCircle2DByCenterAndPointOp(h.id, a, b)).circleId!;
  const circle2 = add(new AddCircle2DByCenterAndPointOp(h.id, b, a)).circleId!;
  add(new AddCircle2DByCenterAndRadiusVectorOp(h.id, a, new Vector3(15, 0, 0)));
  add(new AddLine2DParallelToLineOp(h.id, l, c));
  add(new AddLine2DPerpendicularToLineOp(h.id, l, c));
  add(new AddLine2DByPointAndRelativeAngleOp(h.id, l, c, 0.4));
  add(new AddLine2DTangentToCircleThroughPointOp(h.id, circle, c, 0));
  add(new AddLine2DTangentToCircleParallelToLineOp(h.id, circle, l, 0));
  add(new AddLineLineIntersectionPoint2DOp(h.id, l, l2));
  add(new AddLineCircleIntersectionPoint2DOp(h.id, l, circle, 0));
  add(new AddCircleCircleIntersectionPoint2DOp(h.id, circle, circle2, 0));
  add(new AddGuide2DPerpendicularToLineOp(h.id, l, c));
  add(new Add3DPointOp(a, av, h.id, v.id));
  add(new Add3DLineOp(l, lv, h.id, v.id));
  add(new Add3DSegmentOp(s, sv, h.id, v.id));
  expect(executeConstructionIntent({ operationContext: domain.createOperationContext((session as any).visibilityModel), commands: producer,
    intent: { type: 'create-yz-projection-plane', description: 'YZ families' } }).success).toBe(true);
  return { session, point, add, h };
}

describe('runtime semantic replay across construction families', () => {
  it('accepts legacy absent reservations and rejects malformed label counts before replacing live state', () => {
    const session = new RuntimeSession(); session.initializeDefaultWorldIfNeeded();
    const payload = session.snapshot('Counts');
    const before = identity(session);
    for (const labelCounts of [null, [], { Unknown: 1 }, { Point2D: -1 }, { Point2D: 0.5 }, { Point2D: Infinity }]) {
      expect(() => session.restoreValidatedProject(session.validateProjectData({ ...payload, labelCounts }))).toThrow('labelCounts');
      expect(identity(session)).toEqual(before);
    }
    const { labelCounts: _counts, ...legacy } = payload;
    session.restoreValidatedProject(session.validateProjectData(legacy));
    expect(identity(session)).toEqual(before);
  });
  it('preserves identity and next labels after redo, abandoned redo, JSON reload and overlapping smaller replacement', () => {
    const { session, point, h } = fixture();
    const before = identity(session), beforeCounts = counts(session);
    session.undo(); session.redo();
    expect(identity(session)).toEqual(before);
    expect(counts(session)).toEqual(beforeCounts);
    for (let i = 0; i < 26; i++) session.undo();
    for (let i = 0; i < 26; i++) session.redo();
    expect(identity(session)).toEqual(before);
    expect(counts(session)).toEqual(beforeCounts);
    // An abandoned point has no surviving descriptor. Its forward-only reservation
    // still belongs to the saved session, not to the redo stack.
    point(h.id, 321, 123); session.undo();
    const afterAbandon = counts(session);
    const payload = JSON.parse(JSON.stringify(session.snapshot('Families')));
    const fresh = new RuntimeSession(); fresh.restoreValidatedProject(fresh.validateProjectData(payload));
    expect(identity(fresh)).toEqual(before);
    expect(counts(fresh)).toEqual(afterAbandon);
    // Replace a populated, overlapping runtime, then compare with fresh replay.
    const populated = fixture().session;
    populated.restoreValidatedProject(populated.validateProjectData(payload));
    expect(identity(populated)).toEqual(identity(fresh));
    expect(counts(populated)).toEqual(counts(fresh));
    const nextLabels = (s: RuntimeSession) => categories.map(type => internals(s).domain.labelGenerator.next(type));
    expect(nextLabels(populated)).toEqual(nextLabels(fresh));
    const reference = new RuntimeSession(); reference.restoreValidatedProject(reference.validateProjectData(payload));
    expect(nextLabels(session)).toEqual(nextLabels(reference));
    // Abandon all generated construction families, not only a point: reservations
    // outlive their commands and must survive reload even with no descriptors.
    const abandoned = fixture().session;
    for (let i = 0; i < 26; i++) abandoned.undo();
    internals(abandoned).commandProducer.executeToolCommand('replacement', cmd => {
      cmd.addAndExecute(new AddFreePoint2DOp(h.id, new Vector3(9, 9, 1)));
    });
    const abandonedPayload = abandoned.snapshot('Abandoned families');
    const abandonedFresh = new RuntimeSession();
    abandonedFresh.restoreValidatedProject(abandonedFresh.validateProjectData(JSON.parse(JSON.stringify(abandonedPayload))));
    expect(identity(abandonedFresh)).toEqual(identity(abandoned));
    expect(counts(abandonedFresh)).toEqual(counts(abandoned));
    expect(nextLabels(abandonedFresh)).toEqual(nextLabels(abandoned));
    // A genuinely smaller file replaces all populated families, including overlapping bootstrap IDs.
    const small = new RuntimeSession(); small.initializeDefaultWorldIfNeeded();
    const smallPayload = small.snapshot('Small');
    populated.restoreValidatedProject(populated.validateProjectData(smallPayload));
    expect(identity(populated)).toEqual(identity(small));
    expect(counts(populated)).toEqual(counts(small));
  });
});
