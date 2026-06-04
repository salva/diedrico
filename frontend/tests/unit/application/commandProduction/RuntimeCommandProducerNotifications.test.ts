import { describe, expect, it, vi } from 'vitest';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { CommandStack } from '@/commands/CommandStack';
import type { IOperation } from '@/commands/operations/IOperation';
import type { World } from '@/domain/world/World';
import { createTestWorld } from '../../../helpers/worldHelpers';
import { RuntimeChangePublisher } from '@/application/appShell/RuntimeChangePublisher';

function notifyOnlyOperation(): IOperation {
  return {
    type: 'NotifyOnlyOperation',
    parameters: {},
    outputs: {},
    apply: () => ({ success: true, outputs: {} }),
    undo: (_world: World) => {},
    serialize: () => ({ opType: 'NotifyOnlyOperation' }),
  };
}

describe('RuntimeCommandProducer notification behavior', () => {
  it('notifies when preview cancel rolls back preview operations', () => {
    const { world, visibilityModel } = createTestWorld();
    const notifier = new RuntimeChangePublisher();
    const listener = vi.fn();
    notifier.subscribeToChanges(listener);
    const producer = new RuntimeCommandProducer(world, visibilityModel, new CommandStack(), notifier);
    const preview = producer.startPreviewCommand('Preview command');

    preview.preview(command => command.addAndExecute(notifyOnlyOperation()));
    expect(listener).toHaveBeenCalledTimes(1);

    preview.cancel();

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when preview cancel has no preview operations', () => {
    const { world, visibilityModel } = createTestWorld();
    const notifier = new RuntimeChangePublisher();
    const listener = vi.fn();
    notifier.subscribeToChanges(listener);
    const producer = new RuntimeCommandProducer(world, visibilityModel, new CommandStack(), notifier);
    const preview = producer.startPreviewCommand('Preview command');

    preview.cancel();

    expect(listener).not.toHaveBeenCalled();
  });
});
