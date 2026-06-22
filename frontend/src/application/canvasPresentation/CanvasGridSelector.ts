import { Vector3, type Matrix3 } from 'three';
import type { CanvasGridLabel, CanvasGridLabels, CanvasGridLine, CanvasViewportModel } from './CanvasPresentationModel';

export function computeAdaptiveGridParams(zoom: number): { spacing: number; subdivision: number; majorSpacing: number } {
  const minPixelsPerCell = 15;
  const minSpacing = minPixelsPerCell / zoom;
  const logMin = Math.log10(minSpacing);
  const basePower = Math.floor(logMin);
  for (let n = basePower; n < basePower + 3; n++) {
    const base = Math.pow(10, n);
    for (const subdivision of [10, 5, 2]) {
      const spacing = base / subdivision;
      if (spacing >= minSpacing) return { spacing, subdivision, majorSpacing: base };
    }
  }
  return { spacing: 1, subdivision: 10, majorSpacing: 10 };
}

export function selectCanvasGrid(planeToPaper: Matrix3 | undefined, viewport: CanvasViewportModel): { lines: CanvasGridLine[]; labels: CanvasGridLabels } {
  const empty = { lines: [], labels: { top: [], bottom: [], left: [], right: [] } };
  if (!planeToPaper) return empty;

  const zoom = viewport.zoom;
  const { spacing, majorSpacing } = computeAdaptiveGridParams(zoom);
  const originPaper = new Vector3(0, 0, 1).applyMatrix3(planeToPaper);
  const uPaper = new Vector3(1, 0, 0).applyMatrix3(planeToPaper);
  const vPaper = new Vector3(0, 1, 0).applyMatrix3(planeToPaper);
  const viewportWidth = viewport.width / zoom;
  const viewportHeight = viewport.height / zoom;
  const offsetX = -viewport.panX;
  const offsetY = -viewport.panY;
  const viewportCornersPaper = [
    new Vector3(offsetX, offsetY, 1),
    new Vector3(offsetX + viewportWidth, offsetY, 1),
    new Vector3(offsetX, offsetY + viewportHeight, 1),
    new Vector3(offsetX + viewportWidth, offsetY + viewportHeight, 1)
  ];
  const paperToUV = (p: Vector3) => {
    const offset = new Vector3().subVectors(p, originPaper);
    return { u: offset.dot(uPaper) / uPaper.lengthSq(), v: offset.dot(vPaper) / vPaper.lengthSq() };
  };
  const uvCorners = viewportCornersPaper.map(paperToUV);
  const uMin = Math.min(...uvCorners.map(c => c.u));
  const uMax = Math.max(...uvCorners.map(c => c.u));
  const vMin = Math.min(...uvCorners.map(c => c.v));
  const vMax = Math.max(...uvCorners.map(c => c.v));
  const lines: CanvasGridLine[] = [];
  const uStart = Math.floor(uMin / spacing) * spacing;
  const uEnd = Math.ceil(uMax / spacing) * spacing;
  for (let u = uStart; u <= uEnd; u += spacing) {
    const isMajor = Math.abs((u / majorSpacing) - Math.round(u / majorSpacing)) < 1e-6;
    const p1 = originPaper.clone().addScaledVector(uPaper, u).addScaledVector(vPaper, vMin);
    const p2 = originPaper.clone().addScaledVector(uPaper, u).addScaledVector(vPaper, vMax);
    lines.push({ key: `u-${u}`, x1: (p1.x + viewport.panX) * zoom, y1: (p1.y + viewport.panY) * zoom, x2: (p2.x + viewport.panX) * zoom, y2: (p2.y + viewport.panY) * zoom, major: isMajor });
  }
  const vStart = Math.floor(vMin / spacing) * spacing;
  const vEnd = Math.ceil(vMax / spacing) * spacing;
  for (let v = vStart; v <= vEnd; v += spacing) {
    const isMajor = Math.abs((v / majorSpacing) - Math.round(v / majorSpacing)) < 1e-6;
    const p1 = originPaper.clone().addScaledVector(uPaper, uMin).addScaledVector(vPaper, v);
    const p2 = originPaper.clone().addScaledVector(uPaper, uMax).addScaledVector(vPaper, v);
    lines.push({ key: `v-${v}`, x1: (p1.x + viewport.panX) * zoom, y1: (p1.y + viewport.panY) * zoom, x2: (p2.x + viewport.panX) * zoom, y2: (p2.y + viewport.panY) * zoom, major: isMajor });
  }

  const labels: CanvasGridLabels = { top: [], bottom: [], left: [], right: [] };
  const pushLabel = (arr: CanvasGridLabel[], key: string, value: number, position: number, edge: CanvasGridLabel['edge']) => {
    const limit = edge === 'top' || edge === 'bottom' ? viewport.width : viewport.height;
    if (Number.isFinite(position) && position >= -10 && position <= limit + 10) arr.push({ key, value, position, edge });
  };
  const screenToPaper = (screenX: number, screenY: number) => new Vector3(screenX / zoom - viewport.panX, screenY / zoom - viewport.panY, 1);
  const majorStart = (value: number) => Math.floor(value / majorSpacing) * majorSpacing;
  const majorEnd = (value: number) => Math.ceil(value / majorSpacing) * majorSpacing;
  const findULineIntersectionWithHorizontal = (u: number, yPaper: number): number | null => {
    if (Math.abs(vPaper.y) < 1e-10) return null;
    const v = (yPaper - originPaper.y - u * uPaper.y) / vPaper.y;
    const xPaper = originPaper.x + u * uPaper.x + v * vPaper.x;
    return (xPaper + viewport.panX) * zoom;
  };
  const findVLineIntersectionWithHorizontal = (v: number, yPaper: number): number | null => {
    if (Math.abs(uPaper.y) < 1e-10) return null;
    const u = (yPaper - originPaper.y - v * vPaper.y) / uPaper.y;
    const xPaper = originPaper.x + u * uPaper.x + v * vPaper.x;
    return (xPaper + viewport.panX) * zoom;
  };
  const findULineIntersectionWithVertical = (u: number, xPaper: number): number | null => {
    if (Math.abs(vPaper.x) < 1e-10) return null;
    const v = (xPaper - originPaper.x - u * uPaper.x) / vPaper.x;
    const yPaper = originPaper.y + u * uPaper.y + v * vPaper.y;
    return (yPaper + viewport.panY) * zoom;
  };
  const findVLineIntersectionWithVertical = (v: number, xPaper: number): number | null => {
    if (Math.abs(uPaper.x) < 1e-10) return null;
    const u = (xPaper - originPaper.x - v * vPaper.x) / uPaper.x;
    const yPaper = originPaper.y + u * uPaper.y + v * vPaper.y;
    return (yPaper + viewport.panY) * zoom;
  };
  const pushHorizontalEdgeLabels = (
    edge: 'top' | 'bottom',
    rangeCoordinate: 'u' | 'v',
    screenY: number,
    intersect: (value: number, yPaper: number) => number | null,
  ) => {
    const yPaper = screenY / zoom - viewport.panY;
    const left = paperToUV(screenToPaper(0, screenY));
    const right = paperToUV(screenToPaper(viewport.width, screenY));
    const min = Math.min(left[rangeCoordinate], right[rangeCoordinate]);
    const max = Math.max(left[rangeCoordinate], right[rangeCoordinate]);
    for (let value = majorStart(min); value <= majorEnd(max); value += majorSpacing) {
      pushLabel(labels[edge], `${edge}-${value}`, value, intersect(value, yPaper) ?? NaN, edge);
    }
  };
  const pushVerticalEdgeLabels = (
    edge: 'left' | 'right',
    rangeCoordinate: 'u' | 'v',
    screenX: number,
    intersect: (value: number, xPaper: number) => number | null,
  ) => {
    const xPaper = screenX / zoom - viewport.panX;
    const top = paperToUV(screenToPaper(screenX, 0));
    const bottom = paperToUV(screenToPaper(screenX, viewport.height));
    const min = Math.min(top[rangeCoordinate], bottom[rangeCoordinate]);
    const max = Math.max(top[rangeCoordinate], bottom[rangeCoordinate]);
    for (let value = majorStart(min); value <= majorEnd(max); value += majorSpacing) {
      pushLabel(labels[edge], `${edge}-${value}`, value, intersect(value, xPaper) ?? NaN, edge);
    }
  };
  const uIsHorizontal = Math.abs(uPaper.x) / (Math.abs(uPaper.y) + 1e-10) > 1;
  if (uIsHorizontal) {
    pushHorizontalEdgeLabels('top', 'u', 0, findULineIntersectionWithHorizontal);
    pushHorizontalEdgeLabels('bottom', 'u', viewport.height, findULineIntersectionWithHorizontal);
    pushVerticalEdgeLabels('left', 'v', 0, findVLineIntersectionWithVertical);
    pushVerticalEdgeLabels('right', 'v', viewport.width, findVLineIntersectionWithVertical);
  } else {
    pushHorizontalEdgeLabels('top', 'v', 0, findVLineIntersectionWithHorizontal);
    pushHorizontalEdgeLabels('bottom', 'v', viewport.height, findVLineIntersectionWithHorizontal);
    pushVerticalEdgeLabels('left', 'u', 0, findULineIntersectionWithVertical);
    pushVerticalEdgeLabels('right', 'u', viewport.width, findULineIntersectionWithVertical);
  }
  return { lines, labels };
}
