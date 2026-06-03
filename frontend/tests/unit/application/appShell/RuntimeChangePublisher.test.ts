import { describe, expect, it, vi } from 'vitest';
import { RuntimeSession } from '@/application/appShell/RuntimeSession';
import { RuntimeChangePublisher } from '@/application/appShell/RuntimeChangePublisher';

describe('RuntimeChangePublisher', () => {
  it('owns runtime-facing version and subscribers without World notification plumbing', () => {
    const changes = new RuntimeChangePublisher();
    const listener = vi.fn();

    changes.subscribeToChanges(listener);
    changes.markDirty();

    expect(changes.getVersion()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);

    changes.unsubscribeFromChanges(listener);
    changes.markDirty();

    expect(changes.getVersion()).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps RuntimeSession port subscriptions on the runtime publisher path', () => {
    const session = new RuntimeSession();
    session.initializeDefaultWorldIfNeeded();
    const port = session.activePlanePort();
    const listener = vi.fn();
    const initialVersion = session.getVersion();
    const summaries = port.getProjectionPlaneSummaries();
    const firstPlane = summaries[0];
    const secondPlane = summaries[1];

    if (!firstPlane || !secondPlane) throw new Error('expected initialized default planes');

    port.subscribeToChanges(listener);
    port.setActivePlaneId(secondPlane.id);

    expect(session.getVersion()).toBe(initialVersion + 1);
    expect(listener).toHaveBeenCalledTimes(1);

    port.unsubscribeFromChanges(listener);
    port.setActivePlaneId(firstPlane.id);

    expect(session.getVersion()).toBe(initialVersion + 2);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
