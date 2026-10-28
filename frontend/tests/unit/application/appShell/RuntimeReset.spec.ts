import { Vector3 } from 'three';
import { AddFreePoint2DOp } from '@/commands/operations/world/AddFreePointOp';
import { describe, expect, it } from 'vitest';
import { RuntimeDomainContext } from '@/application/appShell/RuntimeDomainContext';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';

describe('complete domain reset', () => {
  it('persists visibility commands and keeps transient plane changes out of content revisions', () => {
    const session = new RuntimeSession();
    session.initializeDefaultWorldIfNeeded();
    const domain = (session as unknown as { domain: RuntimeDomainContext }).domain;
    const plane = domain.world.getAllProjectionPlanes()[0];
    const producer = (session as any).commandProducer;
    let id = '';
    producer.executeToolCommand('Point', (command: any) => {
      id = command.addAndExecute(new AddFreePoint2DOp(plane.id, new Vector3(80, 90, 1))).outputs.pointId;
    });
    session.elementsPanelPort().toggleVisibility(id);
    expect(plane.getPoint(id)?.visualStyle?.visible).toBe(false);
    session.undo();
    expect(plane.getPoint(id)?.visualStyle?.visible).not.toBe(false);
    session.redo();
    const snapshot = session.snapshot('Visibility');
    const fresh = new RuntimeSession();
    fresh.restoreValidatedProject(fresh.validateProjectData(snapshot));
    const freshDomain = (fresh as unknown as { domain: RuntimeDomainContext }).domain;
    expect(freshDomain.world.getProjectionPlaneById(plane.id)?.getPoint(id)?.visualStyle?.visible).toBe(false);
    for (const element of [domain.world.getAllPlanes()[0], plane]) {
      session.elementsPanelPort().toggleVisibility(element.id);
      expect(element.visualStyle?.visible).toBe(false);
      session.undo();
      expect(element.visualStyle?.visible).not.toBe(false);
    }
    const version = session.getVersion();
    session.cycleActivePlane(1);
    expect(session.getVersion()).toBe(version);
  });
  it('resets every owned registry without changing captured service identity', () => {
    const domain = new RuntimeDomainContext();
    const construction = domain.projectionConstruction;
    domain.dependencies.registerNode('old-child', ['overlapping-id']);
    domain.labelGenerator.next('Point2D');
    domain.idAllocator.next();
    domain.idAllocator.generate3DPointId();
    domain.clear();
    expect(domain.projectionConstruction).toBe(construction);
    expect(domain.dependencies.getDependents('overlapping-id')).toEqual([]);
    expect(domain.labelGenerator.next('Point2D')).toBe('A');
    expect(domain.idAllocator.next()).toBe(1);
    expect(domain.idAllocator.generate3DPointId()).toBe('point3d1');
  });

  it('replaces a populated runtime with a smaller project like a fresh runtime', () => {
    const session = new RuntimeSession();
    session.initializeDefaultWorldIfNeeded();
    const domain = (session as unknown as { domain: RuntimeDomainContext }).domain;
    domain.dependencies.registerNode('abandoned', ['overlapping-id']);
    for (let i = 0; i < 50; i++) domain.labelGenerator.next('Point2D');
    const fresh = new RuntimeSession();
    fresh.initializeDefaultWorldIfNeeded();
    const payload = fresh.snapshot('Small');
    session.restoreValidatedProject(session.validateProjectData(payload));
    expect(session.snapshot('Small').commands).toEqual(fresh.snapshot('Small').commands);
    expect(domain.dependencies.getDependents('overlapping-id')).toEqual([]);
    const freshDomain = (fresh as unknown as { domain: RuntimeDomainContext }).domain;
    expect(domain.labelGenerator.next('Point2D')).toBe(freshDomain.labelGenerator.next('Point2D'));
    session.clear();
    expect(domain.labelGenerator.getCount('Point2D')).toBe(0);
    expect(domain.idAllocator.peek()).toBe(1);
  });
});
