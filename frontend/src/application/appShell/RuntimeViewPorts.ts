import type { Ref } from 'vue';
import type { Matrix3 } from 'three';
import type { CanvasPresentationModel } from '@/application/canvasPresentation/CanvasPresentationModel';
import type { ThreePresentationModel } from '@/application/threePresentation/ThreePresentationModel';
import type { FreePointMoveSession, ToolCommandSink } from '@/tools/ToolCommandIntents';
import type { DescriptionPart } from '@/application/processTree/descriptors/DescriptionPart';
import type { ProcessNodeType } from '@/domain/processTree/ProcessTree';
import type { ThreeViewDisplayOptions } from '@/types/ThreeViewDisplayOptions';

interface RuntimeChangeSubscriptionPort {
  subscribeToChanges(listener: () => void): void;
  unsubscribeFromChanges(listener: () => void): void;
}

interface CanvasPresentationOptions {
  readonly hoveredElementId?: string;
  readonly selectedIds: readonly string[];
  readonly cascadeHighlightIds: readonly string[];
  readonly activePlaneId?: string;
  readonly showProjectedElements: boolean;
  readonly gridVisible: boolean;
}

interface CanvasViewport {
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly width: number;
  readonly height: number;
}

export interface PropertiesDialogViewModel {
  readonly elementId: string;
  readonly elementLabel: string;
  readonly elementType: string;
  readonly planeId: string | null;
  readonly coordinates: string | null;
  readonly position: {
    readonly u: number;
    readonly v: number;
    readonly editable: boolean;
  } | null;
  readonly parameter: {
    readonly kind: 'radius' | 'angle';
    readonly value: number;
    readonly units: 'plane-units' | 'degrees';
    readonly editable: boolean;
  } | null;
  readonly dependencies: readonly string[];
  readonly createdBy: string | null;
  readonly style: {
    readonly color: string;
    readonly lineWidth: number;
    readonly lineStyle: string;
    readonly visible: boolean;
  };
}

export interface CanvasViewPort extends RuntimeChangeSubscriptionPort {
  getActivePlaneId(): string | undefined;
  buildPresentationModel(viewport: CanvasViewport, options: CanvasPresentationOptions): CanvasPresentationModel;
  getElementLabel(elementId: string, elementType: string, planeId?: string): string;
  getMovableFreePointMoveSession(args: { planeId: string; pointId: string; commandSink: ToolCommandSink }): FreePointMoveSession | null;
  screenTo3D(args: { clientX: number; clientY: number; svg: SVGSVGElement; viewportMatrix: Matrix3; activePlaneId: string }): { success: boolean; coordinates?: { x: number; y: number; z: number } };
  getPropertiesDialogViewModel(elementId: string | null): PropertiesDialogViewModel | null;
}

export type ProcessDescriptionPartViewModel =
  | { readonly type: 'text'; readonly content: string }
  | { readonly type: 'element'; readonly content: string; readonly elementId: string };

export interface ProcessNodeViewModel {
  readonly id: string;
  readonly type: ProcessNodeType;
  readonly name?: string;
  readonly children?: readonly ProcessNodeViewModel[];
  readonly showIntermediates?: boolean;
  readonly isOutput: boolean;
  readonly isAuxiliary?: boolean;
  readonly elementId?: string;
  readonly descriptionParts: readonly ProcessDescriptionPartViewModel[];
  readonly isInfeasible: boolean;
  readonly hideBecauseElementMissing: boolean;
}

export interface ProcessTreeReadModel {
  readonly root: ProcessNodeViewModel;
  readonly activeSubprocessId: string;
}

export interface ProcessTreeReadPort extends RuntimeChangeSubscriptionPort {
  getTree(): ProcessTreeReadModel;
  getRelatedActionIds(selectedIds: readonly string[]): Set<string>;
  countNodes(node: ProcessNodeViewModel): number;
}

export interface ElementsPanelElementViewModel {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly visible: boolean;
  readonly properties: string;
}

export interface ElementsPanelPlaneGroupViewModel {
  readonly id: string;
  readonly name: string;
  readonly label: string;
  readonly elements: {
    readonly points: readonly ElementsPanelElementViewModel[];
    readonly lines: readonly ElementsPanelElementViewModel[];
    readonly segments: readonly ElementsPanelElementViewModel[];
    readonly circles: readonly ElementsPanelElementViewModel[];
    readonly guides: readonly ElementsPanelElementViewModel[];
  };
  readonly hasElements: boolean;
}

export interface ElementsPanelReadModel {
  readonly projectionPlanes: readonly ElementsPanelPlaneGroupViewModel[];
  readonly threeDElements: {
    readonly points: readonly ElementsPanelElementViewModel[];
    readonly lines: readonly ElementsPanelElementViewModel[];
    readonly segments: readonly ElementsPanelElementViewModel[];
    readonly planes: readonly ElementsPanelElementViewModel[];
    readonly hasElements: boolean;
  };
}

export interface ElementsPanelPort extends RuntimeChangeSubscriptionPort {
  getReadModel(): ElementsPanelReadModel;
  toggleVisibility(elementId: string): void;
}

export interface ThreePresentationPort extends RuntimeChangeSubscriptionPort {
  buildThreePresentationModel(displayOptions: ThreeViewDisplayOptions, selectedIds: readonly string[]): ThreePresentationModel;
}

export interface PlaneOption {
  readonly id: string;
  readonly label: string;
}

export interface ActivePlaneRuntimePort {
  readonly activePlaneId: Ref<string | undefined>;
  readonly activePlaneName: Ref<string>;
  readonly planeOptions: Ref<readonly PlaneOption[]>;
  setActivePlaneId(id: string): void;
  cycleActivePlane(direction: number): void;
}

export function mapDescriptionParts(parts: readonly DescriptionPart[]): ProcessDescriptionPartViewModel[] {
  return parts.map(part => part.type === 'label'
    ? { type: 'element', content: part.content, elementId: part.elementId ?? part.content }
    : { type: 'text', content: part.content });
}
