import { describe, expect, it } from 'vitest';
import projectionPlaneSelectorSource from '../../../../src/application/threePresentation/ProjectionPlane3DSelector.ts?raw';
import planarSelectorSource from '../../../../src/application/threePresentation/PlanarElement3DSelector.ts?raw';
import reconstructedSelectorSource from '../../../../src/application/threePresentation/ReconstructedElement3DSelector.ts?raw';
import guideSelectorSource from '../../../../src/application/threePresentation/Guide3DSelector.ts?raw';
import hingeSelectorSource from '../../../../src/application/threePresentation/Hinge3DSelector.ts?raw';
import presentationSelectorSource from '../../../../src/application/threePresentation/ThreePresentationSelector.ts?raw';
import presentationReadPortsSource from '../../../../src/application/threePresentation/ThreeWorldReadPort.ts?raw';
import presentationReadModelSource from '../../../../src/application/threePresentation/ThreePresentationReadModel.ts?raw';
import projectionPlaneReadPortSource from '../../../../src/application/threePresentation/ThreeProjectionPlaneReadPort.ts?raw';
import planarReadPortSource from '../../../../src/application/threePresentation/ThreePlanarElementReadPort.ts?raw';
import reconstructedReadPortSource from '../../../../src/application/threePresentation/ThreeReconstructedElementReadPort.ts?raw';
import guideReadPortSource from '../../../../src/application/threePresentation/ThreeGuideReadPort.ts?raw';
import hingeReadPortSource from '../../../../src/application/threePresentation/ThreeHingeReadPort.ts?raw';
import realizationContextSource from '../../../../src/application/threePresentation/ThreeRealizationContext.ts?raw';
import runtimeViewPortsSource from '../../../../src/application/appShell/RuntimeViewPorts.ts?raw';
import canvasReadPortSource from '../../../../src/application/canvasPresentation/CanvasWorldReadPort.ts?raw';
import threeViewSource from '../../../../src/components/panels/ThreeView.vue?raw';

const selectorSources = [projectionPlaneSelectorSource, planarSelectorSource, reconstructedSelectorSource, guideSelectorSource, hingeSelectorSource];
const readPortSources = [presentationReadPortsSource, projectionPlaneReadPortSource, planarReadPortSource, reconstructedReadPortSource, guideReadPortSource, hingeReadPortSource, realizationContextSource];
const selectorAndReadModelSources = [presentationReadModelSource, ...selectorSources];

describe('three presentation architecture boundary', () => {
  it('keeps selectors on named concern read ports instead of a broad ThreeWorldReadPort dependency', () => {
    for (const source of selectorSources) {
      expect(source).not.toMatch(/ThreeWorldReadPort|Pick<\s*ThreeWorldReadPort/);
    }
    expect(presentationSelectorSource).toContain('readPorts.projectionPlanes');
    expect(presentationSelectorSource).toContain('readPorts.planarElements');
    expect(presentationSelectorSource).toContain('readPorts.reconstructedElements');
    expect(presentationSelectorSource).toContain('readPorts.guides');
    expect(presentationSelectorSource).toContain('readPorts.hinges');
  });

  it('keeps World imports localized to runtime-created three read-port adapters and realization context helper', () => {
    for (const source of selectorSources) {
      expect(source).not.toMatch(/@\/domain\/world\/World/);
    }
    for (const source of readPortSources) {
      expect(source).not.toMatch(new RegExp(['RuntimeWorld', 'WorldReadModel', 'PresentationWorld', 'get' + 'World\\s*\\('].join('|')));
    }
  });

  it('keeps selector-facing 3D contracts free of domain realizations, VisualStyle carriers, and raw realization fields', () => {
    for (const source of selectorAndReadModelSources) {
      expect(source).not.toMatch(/VisualStyle|ThreeEntityPresentationData|ProjectionPlaneRealization3D|Plane3DRealization3D|Point2DRealization2D|Line2DRealization2D|Circle2DRealization2D|Point3DRealization3D|Line3DRealization3D|Segment3DRealization3D/);
      expect(source).not.toMatch(/\b(realization|planeRealization|visualStyle)\b/);
      expect(source).not.toMatch(/instanceof\s+(AuxiliaryProjectionPlane|Segment2DByPoints)/);
    }
  });

  it('allows adapter-private domain conversion while keeping public read-model names DTO-native', () => {
    expect(planarReadPortSource).toMatch(/instanceof Segment2DByPoints/);
    expect(projectionPlaneReadPortSource).toMatch(/instanceof AuxiliaryProjectionPlane/);
    expect(readPortSources.join('\n')).not.toMatch(/ThreeEntityPresentationData/);
    expect(presentationReadPortsSource).not.toMatch(/ThreeProjectionPlaneGridSource|getProjectionPlaneGridSource/);
  });

  it('keeps realization context helper free of broad world collection traversal', () => {
    expect(realizationContextSource).not.toMatch(/world\.getAllProjectionPlanes|world\.getAllHingeLines/);
    expect(planarReadPortSource).toContain('const getProjectionPlanes = () => world.getAllProjectionPlanes()');
    expect(hingeReadPortSource).toContain('const getHingeLines = () => world.getAllHingeLines()');
  });

  it('does not introduce generic world/read-model facades or canvas raw seams', () => {
    const searchedSources = [presentationSelectorSource, runtimeViewPortsSource, canvasReadPortSource, ...readPortSources].join('\n');
    expect(searchedSources).not.toMatch(new RegExp(['RuntimeWorld', 'WorldReadModel', 'PresentationWorld', 'SceneKernel', 'get' + 'World\\s*\\('].join('|')));
    expect(canvasReadPortSource).not.toMatch(new RegExp(['getProcessTree', 'get' + 'World', 'getRealizationContext'].join('|')));
  });

  it('keeps production Vue components free of concrete World imports and injection', () => {
    expect(threeViewSource).not.toMatch(new RegExp(['@/domain/world/World', 'WorldInjectionKey', 'get' + 'World\\s*\\('].join('|')));
    expect(threeViewSource).toContain('getReadPorts()');
  });
});
