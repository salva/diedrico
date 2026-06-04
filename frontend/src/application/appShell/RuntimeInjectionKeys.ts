import type { InjectionKey } from 'vue';
import type { CommandHistoryPort, SelectionActionPort } from './AppShellPorts';
import type { ToolCommandSink } from '@/tools/ToolCommandIntents';
import type { ToolRuntimePort } from '@/application/tools/ToolRuntimePort';
import type { ToolInteractionReadPort } from '@/tools/ToolInteractionReadPort';
import type { ProcessHistoryIntentSink } from '@/application/processHistory/ProcessHistoryIntents';
import type { ActivePlaneRuntimePort, CanvasViewPort, ElementsPanelPort, ProcessTreeReadPort, ThreePresentationPort } from './RuntimeViewPorts';

export const CommandHistoryInjectionKey: InjectionKey<CommandHistoryPort> = Symbol('CommandHistoryPort');
export const SelectionActionsInjectionKey: InjectionKey<SelectionActionPort> = Symbol('SelectionActionPort');
export const CanvasCommandProducerInjectionKey: InjectionKey<ToolCommandSink> = Symbol('CanvasCommandProducerPort');
export const ToolRuntimeInjectionKey: InjectionKey<ToolRuntimePort> = Symbol('ToolRuntimePort');
export const ToolInteractionReadInjectionKey: InjectionKey<ToolInteractionReadPort> = Symbol('ToolInteractionReadPort');
export const ProcessHistoryCommandInjectionKey: InjectionKey<ProcessHistoryIntentSink> = Symbol('ProcessHistoryCommandPort');
export const CanvasViewInjectionKey: InjectionKey<CanvasViewPort> = Symbol('CanvasViewPort');
export const ProcessTreeReadInjectionKey: InjectionKey<ProcessTreeReadPort> = Symbol('ProcessTreeReadPort');
export const ElementsPanelInjectionKey: InjectionKey<ElementsPanelPort> = Symbol('ElementsPanelPort');
export const ThreePresentationInjectionKey: InjectionKey<ThreePresentationPort> = Symbol('ThreePresentationPort');
export const ActivePlaneRuntimeInjectionKey: InjectionKey<ActivePlaneRuntimePort> = Symbol('ActivePlaneRuntimePort');
