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
  const { spacing, subdivision, majorSpacing } = computeAdaptiveGridParams(zoom);
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
    if (Number.isFinite(position) && position >= -10 && position <= (edge === 'top' || edge === 'bottom' ? viewport.width + 10 : viewport.height + 10)) arr.push({ key, value, position, edge });
  };
  const uHorizontal = Math.abs(uPaper.x) / (Math.abs(uPaper.y) + 1e-10) > 1;
  const screenToPaper = (x: number, y: number) => new Vector3(x / zoom - viewport.panX, y / zoom - viewport.panY, 1);
  const findULineY = (u: number, xPaper: number) => {
    if (Math.abs(vPaper.x) < 1e-10) return null;
    const t = (xPaper - originPaper.x - u * uPaper.x) / vPaper.x;
    return (originPaper.y + u * uPaper.y + t * vPaper.y + viewport.panY) * zoom;
  };
  const findVLineX = (v: number, yPaper: number) => {
    if (Math.abs(uPaper.y) < 1e-10) return null;
    const t = (yPaper - originPaper.y - v * vPaper.y) / uPaper.y;
    return (originPaper.x + t * uPaper.x + v * vPaper.x + viewport.panX) * zoom;
  };
  if (uHorizontal) {
    for (let u = Math.floor(uMin / majorSpacing) * majorSpacing; u <= Math.ceil(uMax / majorSpacing) * majorSpacing; u += majorSpacing) {
      pushLabel(labels.top, `top-${u}`, u, findVLineX(0, -viewport.panY) ?? NaN, 'top');
      pushLabel(labels.bottom, `bottom-${u}`, u, findVLineX(0, viewport.height / zoom - viewport.panY) ?? NaN, 'bottom');
    }
  } else {
    for (let u = Math.floor(uMin / majorSpacing) * majorSpacing; u <= Math.ceil(uMax / majorSpacing) * majorSpacing; u += majorSpacing) {
      pushLabel(labels.left, `left-${u}`, u, findULineY(u, -viewport.panX) ?? NaN, 'left');
      pushLabel(labels.right, `right-${u}`, u, findULineY(u, viewport.width / zoom - viewport.panX) ?? NaN, 'right');
    }
  }
  void subdivision; void screenToPaper;
  return { lines, labels };
}
