import { describe, expect, it } from 'vitest';
import projectionPlaneSelectorSource from '../../../../src/application/threePresentation/ProjectionPlane3DSelector.ts?raw';
import planarSelectorSource from '../../../../src/application/threePresentation/PlanarElement3DSelector.ts?raw';
import reconstructedSelectorSource from '../../../../src/application/threePresentation/ReconstructedElement3DSelector.ts?raw';
import guideSelectorSource from '../../../../src/application/threePresentation/Guide3DSelector.ts?raw';
import hingeSelectorSource from '../../../../src/application/threePresentation/Hinge3DSelector.ts?raw';
import presentationSelectorSource from '../../../../src/application/threePresentation/ThreePresentationSelector.ts?raw';
import presentationContextSource from '../../../../src/application/threePresentation/ThreePresentationContext.ts?raw';
import presentationReadModelSource from '../../../../src/application/threePresentation/ThreePresentationReadModel.ts?raw';
import projectionPlaneBuilderSource from '../../../../src/application/threePresentation/ThreeProjectionPlaneBuilder.ts?raw';
import planarBuilderSource from '../../../../src/application/threePresentation/ThreePlanarElementBuilder.ts?raw';
import reconstructedBuilderSource from '../../../../src/application/threePresentation/ThreeReconstructedElementBuilder.ts?raw';
import guideBuilderSource from '../../../../src/application/threePresentation/ThreeGuideBuilder.ts?raw';
import hingeBuilderSource from '../../../../src/application/threePresentation/ThreeHingeBuilder.ts?raw';
import realizationContextSource from '../../../../src/application/threePresentation/ThreeRealizationContext.ts?raw';
import runtimeViewPortsSource from '../../../../src/application/appShell/RuntimeViewPorts.ts?raw';
import canvasContextSource from '../../../../src/application/canvasPresentation/CanvasPresentationContext.ts?raw';
import threeViewSource from '../../../../src/components/panels/ThreeView.vue?raw';

const selectorSources = [projectionPlaneSelectorSource, planarSelectorSource, reconstructedSelectorSource, guideSelectorSource, hingeSelectorSource];
const builderSources = [projectionPlaneBuilderSource, planarBuilderSource, reconstructedBuilderSource, guideBuilderSource, hingeBuilderSource, realizationContextSource];
const contextPrivateSources = [presentationContextSource, projectionPlaneBuilderSource, planarBuilderSource, reconstructedBuilderSource, guideBuilderSource, hingeBuilderSource];
const selectorAndReadModelSources = [presentationReadModelSource, ...selectorSources];

describe('three presentation architecture boundary', () => {
  it('keeps selectors on named source DTOs instead of read-port bridges', () => {
    for (const source of selectorSources) {
      expect(source).not.toMatch(/ThreeWorldReadPort|Three[A-Za-z]*ReadPort|Pick<\s*ThreeWorldReadPort/);
    }
    expect(presentationSelectorSource).toContain('buildThreePresentationModel');
    expect(presentationSelectorSource).toContain('input.projectionPlanes');
    expect(presentationSelectorSource).toContain('input.planarPlanes');
    expect(presentationSelectorSource).toContain('input.reconstructedElements');
  });

  it('keeps World imports localized to presentation builders and realization context helper', () => {
    for (const source of selectorSources) {
      expect(source).not.toMatch(/@\/domain\/world\/World/);
    }
    for (const source of [...builderSources, presentationContextSource]) {
      expect(source).not.toMatch(new RegExp(['RuntimeWorld', 'WorldReadModel', 'PresentationWorld', 'get' + 'World\\s*\\('].join('|')));
    }
  });

  it('keeps selector-facing 3D contracts free of domain realizations, VisualStyle carriers, and raw realization fields', () => {
    for (const source of selectorAndReadModelSources) {
      expect(source).not.toMatch(/VisualStyle|ThreeEntityPresentationData|ProjectionPlaneRealization3D|Plane3DRealization3D|Point2DRealization2D|Line2DRealization2D|Circle2DRealization2D|Point3DRealization3D|Line3DRealization3D|Segment3DRealization3D/);
      expect(source).not.toMatch(/\b(realization|planeRealization|visualStyle)\b/);
      expect(source).not.toMatch(/instanceof\s+(AuxiliaryProjectionPlane|Segment2D)/);
    }
  });

  it('allows adapter-private domain conversion while keeping public read-model names DTO-native', () => {
    expect(planarBuilderSource).toMatch(/instanceof Segment2D/);
    expect(projectionPlaneBuilderSource).toMatch(/instanceof AuxiliaryProjectionPlane/);
    expect(contextPrivateSources.join('\n')).toMatch(/Realization|realize2D|realize3D|VisualStyle|visualStyle/);
    expect(builderSources.join('\n')).not.toMatch(/ThreeEntityPresentationData/);
    expect(presentationSelectorSource).not.toMatch(/ThreeProjectionPlaneGridSource|getProjectionPlaneGridSource/);
  });

  it('keeps realization context helper free of broad world collection traversal', () => {
    expect(realizationContextSource).not.toMatch(/world\.getAllProjectionPlanes|world\.getAllHingeLines/);
    expect(presentationContextSource).toContain('const getProjectionPlanes = () => world.getAllProjectionPlanes()');
    expect(presentationContextSource).toContain('const getHingeLines = () => world.getAllHingeLines()');
    expect(planarBuilderSource).not.toMatch(/world\.getAllProjectionPlanes/);
    expect(hingeBuilderSource).not.toMatch(/world\.getAllHingeLines/);
  });

  it('does not introduce generic world/read-model facades or canvas raw seams', () => {
    const searchedSources = [presentationSelectorSource, runtimeViewPortsSource, canvasContextSource, ...builderSources, presentationContextSource].join('\n');
    expect(searchedSources).not.toMatch(new RegExp(['RuntimeWorld', 'WorldReadModel', 'PresentationWorld', 'SceneKernel', 'get' + 'World\\s*\\('].join('|')));
    expect(canvasContextSource).not.toMatch(new RegExp(['getProcessTree', 'get' + 'World', 'getRealizationContext'].join('|')));
  });

  it('keeps production Vue components free of concrete World imports and injection', () => {
    expect(threeViewSource).not.toMatch(new RegExp(['@/domain/world/World', 'WorldInjectionKey', 'get' + 'World\\s*\\('].join('|')));
    expect(threeViewSource).toContain('buildThreePresentationModel(displayOptions.value, selectedIds())');
    expect(threeViewSource).not.toContain('getReadPorts()');
  });
});
