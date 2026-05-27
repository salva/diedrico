import type { InjectionKey } from 'vue';
import type { CommandHistoryPort } from './AppShellPorts';
import type { ToolCommandSink } from '@/application/tools/ToolCommandIntents';
import type { ProcessHistoryIntentSink } from '@/application/processHistory/ProcessHistoryIntents';
import type { ActivePlaneSelectorPort, CanvasViewPort, ElementsPanelPort, ProcessTreeReadPort, ThreePresentationPort } from './RuntimeViewPorts';

export const CommandHistoryInjectionKey: InjectionKey<CommandHistoryPort> = Symbol('CommandHistoryPort');
export const CanvasCommandProducerInjectionKey: InjectionKey<ToolCommandSink> = Symbol('CanvasCommandProducerPort');
export const ProcessHistoryCommandInjectionKey: InjectionKey<ProcessHistoryIntentSink> = Symbol('ProcessHistoryCommandPort');
export const CanvasViewInjectionKey: InjectionKey<CanvasViewPort> = Symbol('CanvasViewPort');
export const ProcessTreeReadInjectionKey: InjectionKey<ProcessTreeReadPort> = Symbol('ProcessTreeReadPort');
export const ElementsPanelInjectionKey: InjectionKey<ElementsPanelPort> = Symbol('ElementsPanelPort');
export const ThreePresentationInjectionKey: InjectionKey<ThreePresentationPort> = Symbol('ThreePresentationPort');
export const ActivePlaneSelectorInjectionKey: InjectionKey<ActivePlaneSelectorPort> = Symbol('ActivePlaneSelectorPort');
