=== RuntimeSession current seams ===
    38	    const toolReadPort = createToolInteractionReadPort(this.world);
    39	    const canvasPresentationController = new CanvasPresentationController();
    40	    return {
    41	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
    42	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
    43	      getActivePlaneId: () => this.world.getActivePlaneId(),
    44	      getPlaneTransformsForInput: () => {
    45	        const transforms = new Map();
    46	        for (const plane of this.world.getAllProjectionPlanes()) {
    47	          const realization = this.world.getProjectionPlane2DRealization(plane.id);
    48	          if (realization) transforms.set(plane.id, realization.paperToPlane2D);
    49	        }
    50	        return transforms;
    51	      },
    52	      buildPresentationModel: (viewport, options) => canvasPresentationController.buildModel(
    53	        canvasReadPort,
    54	        viewport,
    55	        {
    56	          hoveredIds: options.hoveredElementId ? new Set([options.hoveredElementId]) : undefined,
    57	          selectedIds: options.selectedIds.length > 0 ? new Set(options.selectedIds) : undefined,
    58	          cascadeHighlightIds: options.cascadeHighlightIds.length > 0 ? new Set(options.cascadeHighlightIds) : undefined,
    59	          activePlaneId: options.activePlaneId,
    60	          showProjectedElements: options.showProjectedElements,
    61	          gridVisible: options.gridVisible,
    62	        }
    63	      ),
    64	      getElementLabel: (elementId, elementType, planeId) => this.getElementLabel(elementId, elementType, planeId),
    65	      getMovableFreePointMoveSession: ({ planeId, pointId, commandSink }) => {
    66	        const plane = this.world.getProjectionPlaneById(planeId);
    67	        const point = plane?.getPoint(pointId);
    68	        if (!(point instanceof FreePoint2D) || point.locked) return null;
    69	        return commandSink.startFreePointMove({ planeId, pointId, label: point.label ?? pointId });
    70	      },
    71	      invokeToolClick: (tool, context) => tool.handleClick({ ...context, readPort: toolReadPort }),
    72	      screenTo3D: ({ clientX, clientY, svg, viewportMatrix, activePlaneId }) => screenTo3D(clientX, clientY, svg, viewportMatrix, activePlaneId, this.world),
    73	      getPropertiesDialogViewModel: (elementId) => this.getPropertiesDialogViewModel(elementId),
    74	    };
    75	  }
    76	
    77	  processTreeReadPort(): ProcessTreeReadPort {
    78	    return {
    79	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
    80	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
    81	      subscribeToTree: (listener) => this.world.getProcessTree().subscribe(listener),
    82	      getTree: () => buildProcessTreeReadModel({ world: this.world }),
    83	      getRelatedActionIds: (selectedIds) => getRelatedActionIds(selectedIds, { world: this.world }),
    84	      countNodes: (node) => countProcessNodeViewModels(node),
    85	    };
    86	  }
    87	
    88	  elementsPanelPort(): ElementsPanelPort {
    89	    return {
    90	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
    91	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
    92	      getReadModel: () => buildElementsPanelReadModel({ world: this.world }),
    93	      toggleVisibility: (elementId) => toggleElementVisibility(elementId, {
    94	        findElement: (id) => this.findVisibleElement(id),
    95	        markDirty: () => this.world.markDirty(),
    96	      }),
    97	    };
    98	  }
    99	
   100	  threePresentationPort(): ThreePresentationPort {
   101	    const readPort = createThreeWorldReadPort(this.world);
   102	    return {
   103	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
   104	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
   105	      getReadPort: () => readPort,
   106	    };
   107	  }
   108	
   109	  activePlaneSelectorPort(): ActivePlaneSelectorPort {
   110	    return {
   111	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
   112	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
   113	      getPlaneOptions: () => this.world.getAllProjectionPlanes().filter(p => typeof p.id === 'string' && p.id.length > 0).map(p => ({ id: p.id, label: p.name || p.id })),
   114	      getActivePlaneId: () => this.world.getActivePlaneId(),
   115	      getActivePlaneLabel: () => {
   116	        const planeId = this.world.getActivePlaneId();
   117	        return planeId ? (this.world.getProjectionPlaneById(planeId)?.name || planeId) : undefined;
   118	      },
   119	      setActivePlaneId: (id) => this.world.setActivePlaneId(id),
   120	    };
   121	  }
   122	
   123	  canvasCommandProducerPort(toolStore: CanvasToolControllerToolStore): CanvasToolController {
   124	    return new CanvasToolController({
   125	      world: this.world,
   126	      commandStack: this.commandStack,
   127	      toolStore,
   128	    });
   129	  }
   130	
   131	  processHistoryCommandPort(): ProcessHistoryController {
   132	    return new ProcessHistoryController({
   133	      world: this.world,
   134	      commandStack: this.commandStack,
   135	    });
   136	  }
   137	
   138	  activePlanePort(): ActivePlanePort {
   139	    return {
   140	      subscribeToChanges: (listener) => this.world.subscribeToChanges(listener),
   141	      unsubscribeFromChanges: (listener) => this.world.unsubscribeFromChanges(listener),
   142	      getActivePlaneId: () => this.world.getActivePlaneId(),
   143	      setActivePlaneId: (id) => this.world.setActivePlaneId(id),
   144	      getProjectionPlaneSummaries: () => this.world.getAllProjectionPlanes().map((plane) => ({ id: plane.id, name: plane.name })),
   145	      getProjectionPlaneName: (id) => this.world.getProjectionPlaneById(id)?.name,
   146	    };
   147	  }
   148	
   149	  selectionReadPort(): SelectionReadPort {
   150	    return {
   220	  }
   221	
   222	
   223	  private getElementLabel(elementId: string, elementType: string, planeId?: string): string {
   224	    const planes = planeId ? [this.world.getProjectionPlaneById(planeId)].filter(Boolean) : this.world.getAllProjectionPlanes();
   225	    for (const plane of planes) {
   226	      let element: { label?: string } | undefined;
   227	      switch (elementType) {
   228	        case 'point': element = plane?.getPoint(elementId); break;
   229	        case 'line':
   230	        case 'half-hinge-line':
   231	        case 'segment':
   232	        case 'guide': element = plane?.getLine(elementId); break;
   233	        case 'circle': element = plane?.getCircle(elementId); break;
   234	      }
   235	      if (element) return element.label || elementId;
   236	    }
   237	    return elementId;
   238	  }
   239	
   240	  private getPropertiesDialogViewModel(elementId: string | null) {
   241	    return buildPropertiesDialogViewModel(elementId, {
   242	      findElement: (id) => this.findVisibleElement(id),
   243	      world: this.world,
   244	    });
   245	  }
   246	
   247	  private findVisibleElement(elementId: string) {
   248	    return this.world.getElement2D(elementId)
   249	      || this.world.getElement3DById(elementId)
   250	      || this.world.getProjectionPlaneById(elementId);
   251	  }
   252	
   253	  private snapshotHandle(): RuntimeSessionPersistenceSnapshotHandle {
   254	    return {
   255	      commandStack: this.commandStack,
   256	      nextElementId: this.world.peekNextId(),
   257	    };
   258	  }
   259	
   260	  private restoreTarget(): RuntimeSessionPersistenceRestoreHandle {
   261	    return {
   262	      world: this.world,
   263	      commandStack: this.commandStack,
   264	    };
   265	  }
   266	}
=== CanvasWorldReadPort current seams ===
     1	import type { Circle2D, Circle2DRealization2D } from '@/domain/world/Circle';
     2	import type { Element } from '@/domain/world/Element';
     3	import type { Line2D, Line2DRealization2D } from '@/domain/world/Line';
     4	import type { Point2D, Point2DRealization2D } from '@/domain/world/Point';
     5	import type { Point3D } from '@/domain/world/Point3D';
     6	import type { Line3D } from '@/domain/world/Line3D';
     7	import type { Segment3D } from '@/domain/world/Segment3D';
     8	import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
     9	import type { ProjectionPlaneRealization3D } from '@/domain/world/projectionPlane/ProjectionPlaneRealization';
    10	import type { Point3DRealization3D, Line3DRealization3D, Segment3DRealization3D } from '@/domain/world/Element3DRealization3D';
    11	import type { ProjectionElementRealizationContext, Element3DRealizationContext } from '@/domain/world/projectionPlane/ProjectionPlaneContext';
    12	import type { World } from '@/domain/world/World';
    13	import type { CanvasPlaneTransformModel } from './CanvasPresentationModel';
    14	import { resolveVisibility } from '@/domain/world/styleService';
    15	
    16	export interface CanvasWorldReadPort {
    17	  getAllProjectionPlanes(): ProjectionPlane[];
    18	  getProjectionPlane2DTransform(planeId: string): CanvasPlaneTransformModel | undefined;
    19	  getProjectionPlane3DRealization(planeId: string): ProjectionPlaneRealization3D | undefined;
    20	  getAll3DPoints(): Point3D[];
    21	  getAll3DLines(): Line3D[];
    22	  getAll3DSegments(): Segment3D[];
    23	  realizePoint2D(plane: ProjectionPlane, point: Point2D): Point2DRealization2D | undefined;
    24	  realizeLine2D(plane: ProjectionPlane, line: Line2D): Line2DRealization2D | undefined;
    25	  realizeCircle2D(plane: ProjectionPlane, circle: Circle2D): Circle2DRealization2D | undefined | null;
    26	  realizePoint3D(point: Point3D): Point3DRealization3D;
    27	  realizeLine3D(line: Line3D): Line3DRealization3D;
    28	  realizeSegment3D(segment: Segment3D): Segment3DRealization3D;
    29	  isElementVisible(element: Element): boolean;
    30	}
    31	
    32	function createCanvasRealizationContext(world: World): ProjectionElementRealizationContext & Element3DRealizationContext {
    33	  return {
    34	    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    35	    getPoint2D: id => world.getPoint2D(id),
    36	    getLine2D: id => world.getLine2D(id),
    37	    getCircle2D: id => world.getCircle2D(id),
    38	    getProjectionPlane2DRealization: id => world.getProjectionPlane2DRealization(id),
    39	    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    40	    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    41	    getHingeLineById: id => world.getHingeLineById(id),
    42	    getAllProjectionPlanes: () => world.getAllProjectionPlanes(),
    43	    getAllHingeLines: () => world.getAllHingeLines(),
    44	  };
    45	}
    46	
    47	export function createCanvasWorldReadPort(world: World): CanvasWorldReadPort {
    48	  const realizationContext = createCanvasRealizationContext(world);
    49	  return {
    50	    getAllProjectionPlanes: () => world.getAllProjectionPlanes(),
    51	    getProjectionPlane2DTransform: (planeId: string) => {
    52	      const realization = world.getProjectionPlane2DRealization(planeId);
    53	      if (!realization) return undefined;
    54	      return {
    55	        planeId,
    56	        planeToPaper: realization.planeToPaper2D,
    57	        paperToPlane: realization.paperToPlane2D,
    58	      };
    59	    },
    60	    getProjectionPlane3DRealization: (planeId: string) => world.getProjectionPlane3DRealization(planeId),
    61	    getAll3DPoints: () => world.getAll3DPoints(),
    62	    getAll3DLines: () => world.getAll3DLines(),
    63	    getAll3DSegments: () => world.getAll3DSegments(),
    64	    realizePoint2D: (plane, point) => plane.realizePoint2D(point, realizationContext),
    65	    realizeLine2D: (plane, line) => plane.realizeLine2D(line, realizationContext),
    66	    realizeCircle2D: (plane, circle) => plane.realizeCircle2D(circle, realizationContext),
    67	    realizePoint3D: point => point.realize3D(realizationContext),
    68	    realizeLine3D: line => line.realize3D(realizationContext),
    69	    realizeSegment3D: segment => segment.realize3D(realizationContext),
    70	    isElementVisible: element => resolveVisibility(element, world),
    71	  };
    72	}
    73	
    74	export type CanvasPlaneTransformMap = Map<string, CanvasPlaneTransformModel>;
=== CanvasPresentationSelector current seams ===
    20	  constructor(private readonly projected3DSelector = new Projected3DCanvasSelector()) {}
    21	
    22	  select(readPort: CanvasWorldReadPort, viewport: CanvasViewportModel, state: CanvasPresentationState): CanvasPresentationModel {
    23	    const renderItems: CanvasRenderItem[] = [];
    24	    const queryItems: CanvasQueryItem[] = [];
    25	    const planeTransforms: CanvasPlaneTransformMap = new Map();
    26	
    27	    for (const plane of readPort.getAllProjectionPlanes()) {
    28	      const transform = readPort.getProjectionPlane2DTransform(plane.id);
    29	      if (transform) planeTransforms.set(plane.id, transform);
    30	    }
    31	
    32	    for (const plane of readPort.getAllProjectionPlanes()) {
    33	      const transform = planeTransforms.get(plane.id)?.planeToPaper;
    34	      if (!transform) continue;
    35	
    36	      for (const point of plane.getAllPoints()) {
    37	        if (!isCanvasElementVisible(point, readPort)) continue;
    38	        const realization = readPort.realizePoint2D(plane, point);
    39	        if (!realization) continue;
    40	        const style = pointStyle(point, stateFor(point.id, state));
    41	        const position = realization.position.clone().applyMatrix3(transform);
    42	        const primitive: PointPrimitive = { type: 'point', id: `point-${point.id}`, sourceEntityId: point.id, planeId: point.planeId, layer: style.layer, visible: true, style: style.style, position, radius: style.radius };
    43	        renderItems.push(canvasRenderItem(primitive, 'point'));
    44	        queryItems.push({ id: primitive.id, kind: 'point', elementId: point.id, elementType: 'point', planeId: point.planeId, selectable: true, planeGeometry: { type: 'point', position: realization.position.clone(), visualRadiusPixels: style.radius } });
    45	      }
    46	
    47	      for (const line of plane.getAllLines()) {
    48	        if (!isCanvasElementVisible(line, readPort)) continue;
    49	        const realization = readPort.realizeLine2D(plane, line);
    50	        if (!realization) continue;
    51	        const kind = line instanceof HalfHingeLine2D ? 'half-hinge-line' : line instanceof Segment2DByPoints ? 'finite-segment' : line instanceof SiblingGuide2D ? 'sibling-guide' : line instanceof Guide2D ? 'guide' : 'infinite-line';
    52	
    53	        if (kind === 'finite-segment') {
    54	          const style = segmentStyle(line, stateFor(line.id, state));
    55	          const primitive: SegmentPrimitive = { type: 'segment', id: `segment-${line.id}`, sourceEntityId: line.id, planeId: line.planeId, layer: RenderLayer.Elements, visible: true, style, point1: realization.point1.clone().applyMatrix3(transform), point2: realization.point2.clone().applyMatrix3(transform) };
    56	          renderItems.push(canvasRenderItem(primitive, kind));
    57	          queryItems.push({ id: primitive.id, kind, elementId: line.id, elementType: 'segment', planeId: line.planeId, selectable: true, planeGeometry: { type: 'segment', point1: realization.point1.clone(), point2: realization.point2.clone() } });
    58	        } else {
    59	          const style = kind === 'guide' || kind === 'sibling-guide' ? guideStyle(line as Guide2D | SiblingGuide2D, stateFor(line.id, state)) : kind === 'half-hinge-line' ? hingeStyle(line as HalfHingeLine2D, stateFor(line.id, state)) : lineStyle(line, stateFor(line.id, state));
    60	          const prefix = kind === 'guide' || kind === 'sibling-guide' ? 'guide' : kind === 'half-hinge-line' ? 'halfhingeline' : 'line';
    61	          const primitive: LinePrimitive = { type: 'line', id: `${prefix}-${line.id}`, sourceEntityId: line.id, planeId: kind === 'guide' || kind === 'sibling-guide' ? undefined : line.planeId, layer: kind === 'guide' || kind === 'sibling-guide' ? RenderLayer.Guides : kind === 'half-hinge-line' ? RenderLayer.HingeLines : RenderLayer.Elements, visible: true, style, point: realization.point1.clone().applyMatrix3(transform), direction: realization.getDirection().applyMatrix3(transform) };
    62	          renderItems.push(canvasRenderItem(primitive, kind));
    63	          queryItems.push({ id: primitive.id, kind, elementId: line.id, elementType: kind === 'half-hinge-line' ? 'half-hinge-line' : kind === 'guide' || kind === 'sibling-guide' ? 'guide' : 'line', planeId: line.planeId, selectable: true, planeGeometry: { type: 'line', point: realization.point1.clone(), direction: realization.getDirection() } });
    64	
    65	          const arcGeometry = optionalArcGeometry(line);
    66	          if (arcGeometry?.startPoint && arcGeometry?.endPoint && arcGeometry.controlPoints?.length && arcGeometry.style) {
    67	            const pathStyle = { stroke: arcGeometry.style.color, strokeWidth: arcGeometry.style.width, strokeStyle: arcGeometry.style.dashArray ? 'dashed' as const : 'solid' as const, fill: 'none', opacity: arcGeometry.style.opacity, zIndex: 2 };
    68	            const path: PathPrimitive = { type: 'path', id: `arc-${line.id}`, sourceEntityId: line.id, planeId: undefined, layer: RenderLayer.Guides, visible: true, style: pathStyle, points: [[arcGeometry.startPoint.x, arcGeometry.startPoint.y], [arcGeometry.controlPoints[0].x, arcGeometry.controlPoints[0].y], [arcGeometry.endPoint.x, arcGeometry.endPoint.y]], closed: false };
    69	            renderItems.push(canvasRenderItem(path, 'arc'));
    70	          }
    71	        }
    72	      }
    73	
    74	      for (const circle of plane.getAllCircles()) {
    75	        if (!isCanvasElementVisible(circle, readPort)) continue;
    76	        const realization = readPort.realizeCircle2D(plane, circle);
    77	        if (!realization) continue;
    78	        const center = realization.center.clone().applyMatrix3(transform);
    79	        const radius = realization.radiusVector.clone().applyMatrix3(transform).length();
    80	        const primitive: CirclePrimitive = { type: 'circle', id: `circle-${circle.id}`, sourceEntityId: circle.id, planeId: circle.planeId, layer: RenderLayer.Elements, visible: true, style: circleStyle(circle, stateFor(circle.id, state)), cx: center.x, cy: center.y, radius };
    81	        renderItems.push(canvasRenderItem(primitive, 'circle'));
    82	        queryItems.push({ id: primitive.id, kind: 'circle', elementId: circle.id, elementType: 'circle', planeId: circle.planeId, selectable: true, planeGeometry: { type: 'circle', center: realization.center.clone(), radius: realization.getRadius() } });
    83	      }
    84	    }
    85	
    86	    if (state.showProjectedElements) renderItems.push(...this.projected3DSelector.select(readPort, planeTransforms));
    87	    renderItems.sort((a, b) => a.primitive.layer === b.primitive.layer ? a.style.zIndex - b.style.zIndex : a.primitive.layer - b.primitive.layer);
    88	    const activeTransform = state.activePlaneId ? planeTransforms.get(state.activePlaneId)?.planeToPaper : undefined;
    89	    const grid = state.gridVisible === false ? { lines: [], labels: { top: [], bottom: [], left: [], right: [] } } : selectCanvasGrid(activeTransform, viewport);
    90	    return { renderItems, queryItems, gridLines: grid.lines, gridLabels: grid.labels, planeTransforms, activePlaneId: state.activePlaneId };
    91	  }
    92	}
    93	
    94	function stateFor(id: string, state: CanvasPresentationState) { return { selected: state.selectedIds?.has(id), hovered: state.hoveredIds?.has(id), snapTarget: state.activeSnapTargetId === id, cascade: state.cascadeHighlightIds?.has(id), activePlaneId: state.activePlaneId }; }
    95	
=== Projected3DCanvasSelector current seams ===
     1	import { Matrix3 } from 'three';
     2	import { RenderLayer, type LinePrimitive, type PointPrimitive, type SegmentPrimitive } from '@/domain/presentation/Paper';
     3	import { applyMatrix3x4 } from '@/utils/threeUtils';
     4	import type { CanvasRenderItem } from './CanvasPresentationModel';
     5	import { PROJECTED_LINE_STYLE, PROJECTED_POINT_STYLE, PROJECTED_SEGMENT_STYLE } from './CanvasStylePolicy';
     6	import type { CanvasWorldReadPort } from './CanvasWorldReadPort';
     7	import { canvasRenderItem } from './CanvasPresentationSelector';
     8	
     9	export class Projected3DCanvasSelector {
    10	  select(readPort: CanvasWorldReadPort, planeTransforms: Map<string, { planeToPaper: Matrix3 }>): CanvasRenderItem[] {
    11	    const items: CanvasRenderItem[] = [];
    12	    const EPSILON = 1e-10;
    13	
    14	    for (const plane of readPort.getAllProjectionPlanes()) {
    15	      const planeRealization = readPort.getProjectionPlane3DRealization(plane.id);
    16	      const planeToPaper = planeTransforms.get(plane.id)?.planeToPaper;
    17	      if (!planeRealization || !planeToPaper) continue;
    18	
    19	      for (const point3D of readPort.getAll3DPoints()) {
    20	        const realization = readPort.realizePoint3D(point3D);
    21	        if (!realization?.isFeasible()) continue;
    22	        const primitive: PointPrimitive = {
    23	          type: 'point',
    24	          id: `proj3d-point-${point3D.id}-on-${plane.id}`,
    25	          sourceEntityId: point3D.id,
    26	          planeId: plane.id,
    27	          layer: RenderLayer.Guides + 3,
    28	          visible: true,
    29	          style: PROJECTED_POINT_STYLE,
    30	          position: applyMatrix3x4(realization.position, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
    31	          radius: 6,
    32	        };
    33	        items.push(canvasRenderItem(primitive, 'projected-3d-point'));
    34	      }
    35	
    36	      for (const line3D of readPort.getAll3DLines()) {
    37	        const realization = readPort.realizeLine3D(line3D);
    38	        if (!realization?.isFeasible()) continue;
    39	        const direction = applyMatrix3x4(realization.direction, planeRealization.threeDToPlane);
    40	        if (direction.length() < EPSILON) continue;
    41	        const primitive: LinePrimitive = {
    42	          type: 'line',
    43	          id: `proj3d-line-${line3D.id}-on-${plane.id}`,
    44	          sourceEntityId: line3D.id,
    45	          planeId: plane.id,
    46	          layer: RenderLayer.Guides + 3,
    47	          visible: true,
    48	          style: PROJECTED_LINE_STYLE,
    49	          point: applyMatrix3x4(realization.point, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
    50	          direction: direction.applyMatrix3(planeToPaper),
    51	        };
    52	        items.push(canvasRenderItem(primitive, 'projected-3d-line'));
    53	      }
    54	
    55	      for (const segment3D of readPort.getAll3DSegments()) {
    56	        const realization = readPort.realizeSegment3D(segment3D);
    57	        if (!realization?.isFeasible()) continue;
    58	        const primitive: SegmentPrimitive = {
    59	          type: 'segment',
    60	          id: `proj3d-segment-${segment3D.id}-on-${plane.id}`,
    61	          sourceEntityId: segment3D.id,
    62	          planeId: plane.id,
    63	          layer: RenderLayer.Guides + 3,
    64	          visible: true,
    65	          style: PROJECTED_SEGMENT_STYLE,
    66	          point1: applyMatrix3x4(realization.startPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
    67	          point2: applyMatrix3x4(realization.endPoint, planeRealization.threeDToPlane).applyMatrix3(planeToPaper),
    68	        };
    69	        items.push(canvasRenderItem(primitive, 'projected-3d-segment'));
    70	      }
    71	    }
    72	
    73	    return items;
    74	  }
    75	}
=== ThreeWorldReadPort current seams ===
    60	  getReconstructedModels(): ThreeReconstructedReadModel;
    61	  getSelectedGuideModels(selectedIds: readonly string[]): ThreeGuideReadModel[];
    62	  getGuideIntersectionModels(): ThreeGuideIntersectionReadModel;
    63	  getHingeModels(): ThreeHingeReadModel[];
    64	}
    65	
    66	function createThreeRealizationContext(world: World): ProjectionElementRealizationContext & Element3DRealizationContext {
    67	  return {
    68	    getProjectionPlaneById: id => world.getProjectionPlaneById(id),
    69	    getPoint2D: id => world.getPoint2D(id),
    70	    getLine2D: id => world.getLine2D(id),
    71	    getCircle2D: id => world.getCircle2D(id),
    72	    getProjectionPlane2DRealization: id => world.getProjectionPlane2DRealization(id),
    73	    getProjectionPlane3DRealization: id => world.getProjectionPlane3DRealization(id),
    74	    get3DPlaneRealization: id => world.get3DPlaneRealization(id),
    75	    getHingeLineById: id => world.getHingeLineById(id),
    76	    getAllProjectionPlanes: () => world.getAllProjectionPlanes(),
    77	    getAllHingeLines: () => world.getAllHingeLines(),
    78	  };
    79	}
    80	
    81	export function createThreeWorldReadPort(world: World): ThreeWorldReadPort {
    82	  const realizationContext = createThreeRealizationContext(world);
    83	  return {
    84	    getProjectionPlaneModels: () => world.getAllProjectionPlanes().map(plane => ({
    85	      id: plane.id,
    86	      kind: plane instanceof AuxiliaryProjectionPlane ? 'auxiliary' : 'fixed',
    87	      plane3DId: plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane.id,
    88	      realization: world.getProjectionPlane3DRealization(plane.id),
    89	    })),
    90	    getProjectionPlaneGridSource: (planeId: string) => {
    91	      const plane = world.getProjectionPlaneById(planeId);
    92	      const plane3DId = plane instanceof AuxiliaryProjectionPlane ? plane.plane3DId : plane?.id;
    93	      return {
    94	        plane3DRealization: plane3DId ? world.get3DPlaneRealization(plane3DId) : undefined,
    95	        projectionRealization: world.getProjectionPlane3DRealization(planeId),
    96	      };
    97	    },
    98	    getPlanarPlaneModels: () => world.getAllProjectionPlanes().map(plane => ({
    99	      id: plane.id,
   100	      realization: world.getProjectionPlane3DRealization(plane.id),
   101	      points: plane.getAllPoints().map(point => ({ id: point.id, visualStyle: point.visualStyle, realization: point.realize2D(realizationContext) })),
   102	      lines: plane.getAllLines().map(line => ({ id: line.id, visualStyle: line.visualStyle, realization: line.realize2D(realizationContext), isSegment: line instanceof Segment2DByPoints })),
   103	      circles: plane.getAllCircles().map(circle => ({ id: circle.id, visualStyle: circle.visualStyle, realization: circle.realize2D(realizationContext) })),
   104	    })),
   105	    getReconstructedModels: () => ({
   106	      points: world.getAll3DPoints().map(point => ({ id: point.id!, visualStyle: point.visualStyle, realization: world.get3DPointRealization(point.id!) })),
   107	      lines: world.getAll3DLines().map(line => ({ id: line.id!, visualStyle: line.visualStyle, realization: world.get3DLineRealization(line.id!) })),
   108	      segments: world.getAll3DSegments().map(segment => ({ id: segment.id!, visualStyle: segment.visualStyle, realization: world.get3DSegmentRealization(segment.id!) })),
   109	      planes: world.getAllPlanes().map(plane => ({ id: plane.id!, visualStyle: plane.visualStyle, realization: world.get3DPlaneRealization(plane.id!) })),
   110	    }),
   111	    getSelectedGuideModels: (selectedIds: readonly string[]) => selectedIds.flatMap(selectedId => {
   112	      try {
   113	        const line = world.getLine2D(selectedId);
   114	        if (!line || (!isGuide2D(line) && !isSiblingGuide2D(line))) return [];
   115	        return [{ id: line.id, visualStyle: line.visualStyle, planeId: line.planeId, planeRealization: world.getProjectionPlane3DRealization(line.planeId), realization: line.realize2D(realizationContext) }];
   116	      } catch {
   117	        return [];
   118	      }
   119	    }),
   120	    getGuideIntersectionModels: () => ({
   121	      points: world.getAll3DPoints().map(point => {
   122	        const realization = world.get3DPointRealization(point.id!);
   123	        return { id: point.id!, visualStyle: point.visualStyle, cartesian: realization?.isFeasible() ? realization.getCartesian() : undefined };
   124	      }),
   125	      lines: world.getAll3DLines().map(line => {
   126	        const realization = world.get3DLineRealization(line.id!);
   127	        return { id: line.id!, visualStyle: line.visualStyle, point: realization?.isFeasible() ? realization.point : undefined, direction: realization?.isFeasible() ? realization.getDirection() : undefined };
   128	      }),
   129	      segments: world.getAll3DSegments().map(segment => {
   130	        const realization = world.get3DSegmentRealization(segment.id!);
   131	        return { id: segment.id!, visualStyle: segment.visualStyle, startPoint: realization?.isFeasible() ? realization.startPoint : undefined, endPoint: realization?.isFeasible() ? realization.endPoint : undefined };
   132	      }),
   133	    }),
   134	    getHingeModels: () => world.getAllHingeLines().map(hingeLine => ({ id: hingeLine.id, visualStyle: hingeLine.visualStyle, realization: hingeLine.realize3D(realizationContext) })),
   135	  };
   136	}
=== domain realization context current seams ===
     1	import type { Plane3DRealization3D } from '../Element3DRealization3D';
     2	import type { HingeLine } from '../HingeLine';
     3	import type { Line2D } from '../Line';
     4	import type { Circle2D } from '../Circle';
     5	import type { Point2D } from '../Point';
     6	import type { ProjectionPlane } from '@/domain/world/projectionPlane/ProjectionPlane';
     7	import type { ProjectionPlaneRealization2D, ProjectionPlaneRealization3D } from './ProjectionPlaneRealization';
     8	
     9	export interface ProjectionElementRealizationContext {
    10	  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
    11	  getPoint2D(id: string): Point2D | undefined;
    12	  getLine2D(id: string): Line2D | undefined;
    13	  getCircle2D(id: string): Circle2D | undefined;
    14	  getProjectionPlane2DRealization(id: string): ProjectionPlaneRealization2D | undefined;
    15	  getProjectionPlane3DRealization(id: string): ProjectionPlaneRealization3D | undefined;
    16	  get3DPlaneRealization(id: string): Plane3DRealization3D | undefined;
    17	  getHingeLineById(id: string): HingeLine | undefined;
    18	  getAllProjectionPlanes(): ProjectionPlane[];
    19	  getAllHingeLines(): HingeLine[];
    20	}
    21	
    22	export interface ProjectionPlaneRealizationContext extends ProjectionElementRealizationContext {}
    23	
    24	export interface Element3DRealizationContext extends ProjectionElementRealizationContext {}
    25	
    26	export interface PlaneEquationRealizationContext extends ProjectionElementRealizationContext {}
    27	
    28	export interface ProjectionOwnerPlaneQuery {
    29	  getPlaneForElement(id: string): ProjectionPlane | undefined;
    30	}
    31	
    32	export interface ProjectionPlaneDependencyRegistrar {
    33	  registerNode(id: string, dependencies: string[]): void;
    34	  unregisterNode(id: string): void;
    35	}
    36	
    37	export interface ProjectionPlaneMutationContext extends ProjectionPlaneRealizationContext, ProjectionOwnerPlaneQuery {
    38	  getNextId(): number;
    39	  generateDefaultLabel(elementId: string, elementType: string): string;
    40	  getDependencyService(): ProjectionPlaneDependencyRegistrar;
    41	  markDirty(): void;
    42	  getSiblingPlaneForIntersection?(point: Point2D): string | undefined;
    43	}
     1	/**
     2	 * Element3D - Abstract base class for 3D geometric elements
     3	 * 
     4	 * Extends Element with no additional properties.
     5	 * Serves as type marker and organizational structure for 3D elements.
     6	 * 
     7	 * **Phase 52**: Introduced as part of unified Element hierarchy to distinguish
     8	 * 3D elements from 2D elements in the type system.
     9	 * 
    10	 * **Current 3D element types**:
    11	 * - Plane3D (and subclasses: Plane3DFixed, Plane3DByTraces, Plane3DByPointAndNormal)
    12	 * - HingeLine
    13	 * 
    14	 * **Future 3D element types** (when needed):
    15	 * - Point3D (3D point in space)
    16	 * - Line3D (3D line in space)
    17	 * - Circle3D (3D circle in space)
    18	 * 
    19	 * **Design Note**: Element3D "probably adds nothing" (per planning notes) because
    20	 * 3D elements don't need:
    21	 * - `planeId` (they're not confined to a single projection plane)
    22	 * - `visible` (3D elements don't have direct UI visibility toggles; their 2D projections do)
    23	 * - `type` discriminator (handled by concrete subclass instanceof checks)
    24	 * 
    25	 * However, Element3D provides:
    26	 * - **Type Organization**: Clear distinction between 2D and 3D elements in type system
    27	 * - **Dependency Interface**: All 3D elements must implement getDependencies()
    28	 * - **Future Extensibility**: Common place to add 3D-specific functionality later
    29	 * 
    30	 */
    31	import { Element } from './Element';
    32	import type { Element3DRealization3D } from './Element3DRealization3D';
    33	import type { Element3DRealizationContext } from './projectionPlane/ProjectionPlaneContext';
    34	
    35	export abstract class Element3D extends Element {
    36	  /**
    37	   * Compute 3D geometric realization from defining data
    38	   * 
    39	   * @param context - Narrow realization context for resolving dependencies (2D projections, planes)
    40	   * @returns Element3DRealization3D with numeric coordinates, or infeasible if computation fails
    41	   */
    42	  abstract realize3D(context: Element3DRealizationContext): Element3DRealization3D;
    43	
    44	  /**
    45	   * Get dependencies - IDs of elements this 3D element depends on
    46	   * 
    47	   * Examples:
    48	   * - Plane3DFixed: [] (no dependencies)
    49	   * - Plane3DByTraces: [traceH, traceV] (depends on 2D trace lines)
    50	   * - HingeLine: [plane1, plane2] (depends on two planes)
    51	   * 
    52	   * @returns Array of element IDs that this element depends on
    53	   */
    54	  abstract getDependencies(): string[];
    55	  
    56	  /**
    57	   * Clone this 3D element
    58	   * Must be implemented by concrete subclasses
    59	   */
    60	  abstract clone(): Element3D;
    61	}
    62	
    63	/**
    64	 * Type guard to check if an object is an Element3D
    65	 * 
    66	 * @param obj Object to check
    67	 * @returns true if obj is an Element3D, false otherwise
    68	 */
    69	export function isElement3D(obj: any): obj is Element3D {
    70	  return obj instanceof Element3D;
     1	/**
     2	 * Plane3D - 3D plane representation (abstract base)
     3	 * 
     4	 * Abstract base class for 3D planes. Concrete implementations provide
     5	 * specific construction rules:
     6	 * - Plane3DFixed: Hard-coded planes (P_H: z=0, P_V: y=0) for initialization
     7	 * - Plane3DByTraces: Computed from traces (future)
     8	 * 
     9	 * **Phase 52**: Refactored to extend Element3D, removing id and label properties
    10	 * which are now inherited from Element base class.
    11	 * 
    12	 * Per data-model.md §Plane3DByPointAndNormal:
    13	 * - Point on plane (P₀)
    14	 * - Normal vector (n)
    15	 * - Plane3D equation: n·(P - P₀) = 0
    16	 * 
    17	 */
    18	
    19	import { Vector3, Vector4 } from 'three';
    20	import { Element3D } from './Element3D';
    21	import { Plane3DRealization3D } from './Element3DRealization3D';
    22	import { applyMatrix4x3, crossVector3Homogeneous } from '@/utils/threeUtils';
    23	import { computeLineLineIntersection3D } from '@/utils/projectionPlaneUtils';
    24	import type { PlaneEquationRealizationContext } from './projectionPlane/ProjectionPlaneContext';
    25	
    26	export abstract class Plane3D extends Element3D {
    27	  /**
    28	   * Get plane equation [a, b, c, d] where ax + by + cz + d = 0
    29	   * Each concrete class computes this based on its representation
    30	   */
    31	  abstract getPlaneEquation(context: PlaneEquationRealizationContext): Vector4 | null;
    32	
    33	  /**
    34	   * Compute 3D realization (plane equation + rendering geometry)
    35	   * Uses getPlaneEquation() from concrete class
    36	   */
    37	  realize3D(context: PlaneEquationRealizationContext): Plane3DRealization3D {
    38	    const equation = this.getPlaneEquation(context);
    39	    
    40	    if (!equation) {
    41	      return Plane3DRealization3D.infeasible();
    42	    }
    43	    
    44	    const a = equation.x;
    45	    const b = equation.y;
    46	    const c = equation.z;
    47	    const d = equation.w;
    48	    
    49	    // Normal vector from plane equation
    50	    const normal = new Vector4(a, b, c, 0);
    51	    
    52	    // Compute origin point on the plane: P = -d * N (since |N| = 1)
    53	    const originPoint = new Vector4(-d * a, -d * b, -d * c, 1);
    54	    
    55	    // Compute quaternion for mesh orientation (aligns (0,0,1) with plane normal)
    56	    const defaultNormal = new Vector4(0, 0, 1, 0);
    57	    
    58	    // Compute rotation axis and angle using cross product and dot product
    59	    const axis = crossVector3Homogeneous(defaultNormal, normal);
    60	    const axisLength = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z);
    61	    const dotProduct = defaultNormal.x * normal.x + defaultNormal.y * normal.y + defaultNormal.z * normal.z;
    62	    
    63	    let quaternion: Vector4;
    64	    if (axisLength < 1e-10) {
    65	      // Normals are parallel or anti-parallel
    66	      if (dotProduct > 0) {
    67	        // Same direction - no rotation needed
    68	        quaternion = new Vector4(0, 0, 0, 1);
    69	      } else {
    70	        // Opposite direction - 180° rotation around any perpendicular axis
    71	        const perpAxis = Math.abs(a) < 0.9 ? new Vector4(1, 0, 0, 0) : new Vector4(0, 1, 0, 0);
    72	        const rotAxis = crossVector3Homogeneous(perpAxis, normal).normalize();
    73	        quaternion = new Vector4(rotAxis.x, rotAxis.y, rotAxis.z, 0);
    74	      }
    75	    } else {
    76	      // General case - compute quaternion from axis-angle
    77	      const halfAngle = 0.5 * Math.atan2(axisLength, dotProduct);
    78	      const sinHalf = Math.sin(halfAngle);
    79	      const cosHalf = Math.cos(halfAngle);
    80	      axis.normalize();
    81	      quaternion = new Vector4(
    82	        axis.x * sinHalf,
    83	        axis.y * sinHalf,
    84	        axis.z * sinHalf,
    85	        cosHalf
    86	      );
    87	    }
    88	    
    89	    return new Plane3DRealization3D(equation, true, quaternion, originPoint);
    90	  }
    91	
    92	  /**
    93	   * Get dependencies - IDs of elements this plane depends on
    94	   * Fixed planes have no dependencies, trace-based planes depend on traces
    95	   * Inherited from Element3D
    96	   */
    97	  abstract getDependencies(): string[];
    98	
    99	  protected constructor(id: string, label?: string) {
   100	    super(id, label);
   101	  }
   102	
   103	  /**
   104	   * Clone this plane
   105	   * Subclasses must implement their own cloning logic
   106	   */
   107	  abstract clone(): Plane3D;
   108	}
   109	
   110	/**
   111	 * Plane3DFixed - Fixed 3D plane defined by point and normal
   112	 * 
   113	 * Represents a plane with fixed geometric definition (no dependencies).
   114	 * The plane is fully defined by a point on the plane and a normal vector.
   115	 * 
   116	 * **Phase 52**: Updated constructor to pass id as required parameter to parent,
   117	 * and implements getDependencies() from Element3D.
   118	 * 
   119	 * @remarks This class is typically used during world initialization but can
   120	 * represent any plane defined by point and normal without dependencies.
