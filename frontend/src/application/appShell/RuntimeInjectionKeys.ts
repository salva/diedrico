import type { InjectionKey } from 'vue';
import type { World } from '@/domain/world/World';
import type { CommandHistoryPort } from './AppShellPorts';
import type { ToolCommandSink } from '@/application/tools/ToolCommandIntents';
import type { ProcessHistoryIntentSink } from '@/application/processHistory/ProcessHistoryIntents';

export const WorldInjectionKey: InjectionKey<World> = Symbol('WorldForView');
export const CommandHistoryInjectionKey: InjectionKey<CommandHistoryPort> = Symbol('CommandHistoryPort');
export const CanvasCommandProducerInjectionKey: InjectionKey<ToolCommandSink> = Symbol('CanvasCommandProducerPort');
export const ProcessHistoryCommandInjectionKey: InjectionKey<ProcessHistoryIntentSink> = Symbol('ProcessHistoryCommandPort');
