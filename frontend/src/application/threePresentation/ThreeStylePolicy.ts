import type { VisualStyle } from '@/domain/world/VisualStyle';
import type { ThreeStyleDto } from './ThreePresentationModel';
import type { ThreeEntitySourceDto } from './ThreePresentationReadModel';

interface DomainStyleSource { visualStyle?: VisualStyle }

export const THREE_STYLE = {
  grid: { color: 0x888888, opacity: 0.7, transparent: true },
  projectionPlane: { color: 0xdddddd, opacity: 0.18, transparent: true },
  planarElement: { color: 0x2196f3, opacity: 0.7, transparent: true, radius: 0.15 },
  reconstructedElement: { color: 0xff6b35, opacity: 1, radius: 0.15 },
  reconstructedPlane: { color: 0xbdbdbd, opacity: 0.4, transparent: true },
  guidePlane: { color: 0x00bcd4, opacity: 0.25, transparent: true },
  guideMarker: { color: 0xffd700, radius: 0.25 },
  hinge: { color: 0x333333, dashSize: 0.5, gapSize: 0.3, lineWidth: 2 },
  referenceAxisLength: 15,
  auxiliaryAxisLength: 10,
  infiniteLineExtent: 2000,
  planarLineExtent: 2000,
  zOffset: 0.01,
} as const;

export function planarStyleFromDomain(element: DomainStyleSource): ThreeStyleDto {
  return { ...THREE_STYLE.planarElement, color: element.visualStyle?.color ?? THREE_STYLE.planarElement.color };
}

export function reconstructedStyleFromDomain(element: DomainStyleSource): ThreeStyleDto {
  return { ...THREE_STYLE.reconstructedElement, color: element.visualStyle?.color ?? THREE_STYLE.reconstructedElement.color };
}

export function visibleFromDomain(element: DomainStyleSource): boolean { return element.visualStyle?.visible !== false; }

export function isVisible(element: ThreeEntitySourceDto): boolean { return element.visible; }
