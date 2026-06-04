import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import ActionsPanel from '@/components/panels/ActionsPanel.vue';
import Toolbar from '@/components/toolbars/Toolbar.vue';
import { ProcessHistoryController } from '@/application/processHistory/ProcessHistoryController';
import { RuntimeCommandProducer } from '@/application/commandProduction/RuntimeCommandProducer';
import { ProcessHistoryUseCases } from '@/application/processHistory/ProcessHistoryUseCases';
import { useToolStore } from '@/stores/toolStore';
import { useViewStore } from '@/stores/viewStore';
import { createTestWorld, buildOperationContext } from '../../helpers/worldHelpers';
import { CommandHistoryInjectionKey, ProcessHistoryCommandInjectionKey, ProcessTreeReadInjectionKey } from '@/application/appShell/RuntimeInjectionKeys';

vi.mock('@/components/panels/ProcessTreeNode.vue', () => ({
  default: {
    name: 'ProcessTreeNode',
    props: ['node', 'dataVersion', 'selectedNodeId', 'activeSubprocessId', 'relatedActionIds'],
    emits: ['toggle-encapsulate', 'toggle-output', 'rename-node', 'select-node'],
    template: `
      <div class="process-tree-node-stub">
        <button class="stub-toggle-encapsulate" @click="$emit('toggle-encapsulate', activeSubprocessId)">toggle encapsulate</button>
        <button class="stub-toggle-output" @click="$emit('toggle-output', activeSubprocessId)">toggle output</button>
        <button class="stub-rename" @click="$emit('rename-node', activeSubprocessId, 'Renamed from component')">rename</button>
      </div>
    `
  }
}));

vi.mock('@/components/toolbars/PlaneSelector.vue', () => ({ default: { name: 'PlaneSelector', template: '<div class="plane-selector-stub" />' } }));
vi.mock('@/components/toolbars/ToolFamilyButton.vue', () => ({ default: { name: 'ToolFamilyButton', props: ['family'], template: '<button class="tool-family-stub" />' } }));
vi.mock('@/components/LoginStatusWidget.vue', () => ({ default: { name: 'LoginStatusWidget', emits: ['sign-in', 'sign-out'], template: '<div class="login-status-stub" />' } }));
vi.mock('@/components/icons/toolbar/SelectionToolIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/NewFileIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/OpenFileIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/UndoIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/RedoIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/GridIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/ProjectionIcon.vue', () => ({ default: { template: '<span />' } }));
vi.mock('@/components/icons/toolbar/ZoomFitIcon.vue', () => ({ default: { template: '<span />' } }));

const iconStub = {
  template: '<span class="icon-stub" />'
};


function createProcessTreeReadPort(world: any) {
  const listeners = new Set<() => void>();
  const node = (raw: any): any => raw.type === 'action'
    ? { id: raw.id, type: raw.type, isOutput: raw.isOutput, elementId: raw.elementId, descriptionParts: [], isInfeasible: false, hideBecauseElementMissing: false }
    : { id: raw.id, type: raw.type, name: raw.name, children: raw.children.filter((child: any) => child !== null).map(node), showIntermediates: raw.showIntermediates, isOutput: raw.isOutput, isAuxiliary: raw.isAuxiliary, descriptionParts: [], isInfeasible: false, hideBecauseElementMissing: false };
  const read = () => ({ root: node(world.getProcessTree().root), activeSubprocessId: world.getProcessTree().getCurrentSubprocess().id });
  const count = (n: any): number => 1 + (n.children?.reduce((sum: number, child: any) => sum + count(child), 0) ?? 0);
  return {
    subscribeToChanges: (listener: () => void) => { listeners.add(listener); },
    unsubscribeFromChanges: (listener: () => void) => { listeners.delete(listener); },
    notifyChange: () => { listeners.forEach(listener => listener()); },
    getTree: read,
    getRelatedActionIds: () => new Set<string>(),
    countNodes: count,
  };
}

function toolbarStubs() {
  return {
    LoginStatusWidget: {
      template: '<div class="login-status-stub"><button class="stub-sign-in" @click="$emit(\'sign-in\')">sign in</button><button class="stub-sign-out" @click="$emit(\'sign-out\')">sign out</button></div>',
      emits: ['sign-in', 'sign-out']
    },
    PlaneSelector: { template: '<div class="plane-selector-stub" />' },
    ToolFamilyButton: { template: '<button class="tool-family-stub" />', props: ['family'] },
    SelectionToolIcon: iconStub,
    NewFileIcon: iconStub,
    OpenFileIcon: iconStub,
    UndoIcon: iconStub,
    RedoIcon: iconStub,
    GridIcon: iconStub,
    ProjectionIcon: iconStub,
    ZoomFitIcon: iconStub
  };
}

describe('Wave 006b ActionsPanel component behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('delegates stack button and keyboard subprocess intents through the application controller', async () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    commandStack.clear();
    const processTreeReadPort = createProcessTreeReadPort(world);

    const wrapper = mount(ActionsPanel, {
      global: {
        provide: { [ProcessTreeReadInjectionKey as symbol]: processTreeReadPort, [ProcessHistoryCommandInjectionKey as symbol]: new ProcessHistoryController({ world, commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack, processTreeReadPort) }) },
        stubs: {
          ProcessTreeNode: {
            template: '<div class="process-tree-node-stub" />',
            props: ['node', 'dataVersion', 'selectedNodeId', 'activeSubprocessId', 'relatedActionIds']
          }
        }
      }
    });

    const pushButton = wrapper.get('button.stack-push-btn');
    const popButton = wrapper.get('button.stack-pop-btn');
    expect(popButton.attributes('disabled')).toBeDefined();

    await pushButton.trigger('click');
    await nextTick();
    expect(world.getProcessTree().getStackDepth()).toBe(2);
    expect(commandStack.getUndoCount()).toBe(1);
    expect(wrapper.get('button.stack-pop-btn').attributes('disabled')).toBeUndefined();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '[', ctrlKey: true, shiftKey: true }));
    await nextTick();
    expect(world.getProcessTree().getStackDepth()).toBe(1);
    expect(commandStack.getUndoCount()).toBe(2);
    expect(wrapper.get('button.stack-pop-btn').attributes('disabled')).toBeDefined();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: ']', ctrlKey: true, shiftKey: true }));
    await nextTick();
    expect(world.getProcessTree().getStackDepth()).toBe(2);
    expect(commandStack.getUndoCount()).toBe(3);

    wrapper.unmount();
  });

  it('delegates process-tree child toggle and rename events without direct command assembly in the component', async () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    commandStack.clear();
    const processTreeReadPort = createProcessTreeReadPort(world);

    const wrapper = mount(ActionsPanel, {
      global: {
        provide: { [ProcessTreeReadInjectionKey as symbol]: processTreeReadPort, [ProcessHistoryCommandInjectionKey as symbol]: new ProcessHistoryController({ world, commands: new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack, processTreeReadPort) }) },
        stubs: {
          ProcessTreeNode: {
            name: 'ProcessTreeNode',
            template: `
              <div class="process-tree-node-stub">
                <button class="stub-toggle-encapsulate" @click="$emit('toggle-encapsulate', activeSubprocessId)">toggle encapsulate</button>
                <button class="stub-toggle-output" @click="$emit('toggle-output', activeSubprocessId)">toggle output</button>
                <button class="stub-rename" @click="$emit('rename-node', activeSubprocessId, 'Renamed from component')">rename</button>
              </div>
            `,
            props: ['node', 'dataVersion', 'selectedNodeId', 'activeSubprocessId', 'relatedActionIds'],
            emits: ['toggle-encapsulate', 'toggle-output', 'rename-node']
          }
        }
      }
    });

    await wrapper.get('button.stack-push-btn').trigger('click');
    await nextTick();
    const subprocessId = world.getProcessTree().getCurrentSubprocess().id;
    expect(visibilityModel.get(subprocessId, 'subprocess').showIntermediates).toBe(true);
    expect(visibilityModel.get(subprocessId, 'subprocess').isOutput).toBe(true);

    await wrapper.get('button.stub-toggle-encapsulate').trigger('click');
    await nextTick();
    expect(visibilityModel.get(subprocessId, 'subprocess').showIntermediates).toBe(false);

    await wrapper.get('button.stub-toggle-output').trigger('click');
    await nextTick();
    expect(visibilityModel.get(subprocessId, 'subprocess').isOutput).toBe(false);

    await wrapper.get('button.stub-rename').trigger('click');
    await nextTick();
    expect(world.getProcessTree().findSubprocessById(subprocessId)?.name).toBe('Renamed from component');
    expect(commandStack.getUndoCount()).toBe(4);

    wrapper.unmount();
  });
});

describe('Wave 006b Toolbar component behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useToolStore().setTool('select');
    const viewStore = useViewStore();
    if (!viewStore.gridVisible.value) viewStore.toggleGrid();
  });

  it('delegates undo/redo through the toolbar history controller and refreshes enabled state', async () => {
    const { world, visibilityModel, commandStack } = createTestWorld();
    commandStack.clear();
    const processHistory = new ProcessHistoryUseCases(world, new RuntimeCommandProducer(buildOperationContext(world, visibilityModel), commandStack));
    processHistory.pushSubprocess({ name: 'Undoable from toolbar test' });

    const wrapper = mount(Toolbar, {
      global: {
        provide: { [CommandHistoryInjectionKey as symbol]: commandStack },
        stubs: { ...toolbarStubs(), 'plane-selector': true, 'tool-family-button': true, 'login-status-widget': true }
      }
    });

    const historyButtons = wrapper.findAll('button.history-button');
    const undoButton = historyButtons[0];
    const redoButton = historyButtons[1];
    expect(undoButton.attributes('disabled')).toBeUndefined();
    expect(redoButton.attributes('disabled')).toBeDefined();

    await undoButton.trigger('click');
    await nextTick();
    expect(commandStack.canUndo()).toBe(false);
    expect(commandStack.canRedo()).toBe(true);
    expect(wrapper.findAll('button.history-button')[0].attributes('disabled')).toBeDefined();
    expect(wrapper.findAll('button.history-button')[1].attributes('disabled')).toBeUndefined();

    await wrapper.findAll('button.history-button')[1].trigger('click');
    await nextTick();
    expect(commandStack.canUndo()).toBe(true);
    expect(commandStack.canRedo()).toBe(false);
    expect(wrapper.findAll('button.history-button')[0].attributes('disabled')).toBeUndefined();
    expect(wrapper.findAll('button.history-button')[1].attributes('disabled')).toBeDefined();

    wrapper.unmount();
  });

  it('preserves toolbar presentation behavior for tool selection, view toggles, and Alt+E deletion', async () => {
    const { commandStack } = createTestWorld();
    commandStack.clear();
    const wrapper = mount(Toolbar, {
      global: {
        provide: { [CommandHistoryInjectionKey as symbol]: commandStack },
        stubs: { ...toolbarStubs(), 'plane-selector': true, 'tool-family-button': true, 'login-status-widget': true }
      }
    });

    const toolStore = useToolStore();
    const viewStore = useViewStore();
    const buttonsByLabel = (label: string) => wrapper.get(`button[aria-label="${label}"]`);

    await buttonsByLabel('Selection Tool').trigger('click');
    expect(toolStore.currentTool.value).toBe('select');

    const initialGridVisibility = viewStore.gridVisible.value;
    await buttonsByLabel('Toggle Grid').trigger('click');
    expect(viewStore.gridVisible.value).toBe(!initialGridVisibility);

    const initialProjectionVisibility = viewStore.showProjectedElements.value;
    await buttonsByLabel('Toggle 3D Projections').trigger('click');
    expect(viewStore.showProjectedElements.value).toBe(!initialProjectionVisibility);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await nextTick();
    expect(toolStore.currentTool.value).toBe('select');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', altKey: true }));
    await nextTick();
    expect(commandStack.getUndoCount()).toBe(0);

    wrapper.unmount();
  });
});
