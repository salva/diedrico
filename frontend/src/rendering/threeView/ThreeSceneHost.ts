import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { domainDirectionToThreeJS } from '@/utils/threeUtils';
import { ThreeObjectRegistry } from './ThreeObjectRegistry';

export interface ThreeSceneHostMount { container: HTMLElement; canvas: HTMLCanvasElement }

interface ThreeRendererPort {
  readonly domElement: HTMLCanvasElement;
  setPixelRatio(ratio: number): void;
  setSize(width: number, height: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
}

interface ThreeLabelRendererPort {
  readonly domElement: HTMLElement;
  setSize(width: number, height: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
}

interface ThreeControlsPort {
  enableDamping: boolean;
  dampingFactor: number;
  screenSpacePanning: boolean;
  minDistance: number;
  maxDistance: number;
  maxPolarAngle: number;
  update(): void;
  dispose(): void;
}

export interface ThreeSceneHostPlatform {
  createRenderer(mount: ThreeSceneHostMount): ThreeRendererPort;
  createLabelRenderer(): ThreeLabelRendererPort;
  createControls(camera: THREE.PerspectiveCamera, domElement: HTMLElement): ThreeControlsPort;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  pixelRatio(): number;
}

export interface ThreeSceneHostOptions {
  platform?: ThreeSceneHostPlatform;
}

function createDefaultPlatform(): ThreeSceneHostPlatform {
  return {
    createRenderer: mount => new THREE.WebGLRenderer({ canvas: mount.canvas, antialias: true, alpha: false }),
    createLabelRenderer: () => new CSS2DRenderer(),
    createControls: (camera, domElement) => new OrbitControls(camera, domElement),
    requestAnimationFrame: callback => window.requestAnimationFrame(callback),
    cancelAnimationFrame: id => window.cancelAnimationFrame(id),
    pixelRatio: () => window.devicePixelRatio,
  };
}

export class ThreeSceneHost {
  readonly scene = new THREE.Scene();
  readonly registry = new ThreeObjectRegistry(this.scene);
  private readonly platform: ThreeSceneHostPlatform;
  private camera?: THREE.PerspectiveCamera;
  private renderer?: ThreeRendererPort;
  private labelRenderer?: ThreeLabelRendererPort;
  private controls?: ThreeControlsPort;
  private animationFrameId?: number;
  private mounted?: ThreeSceneHostMount;

  constructor(options: ThreeSceneHostOptions = {}) {
    this.platform = options.platform ?? createDefaultPlatform();
  }

  mount(mount: ThreeSceneHostMount): void {
    if (this.mounted) this.disposePlatformResources();
    this.mounted = mount;
    this.scene.background = new THREE.Color(0xf5f5f5);
    const aspect = mount.container.clientWidth / Math.max(1, mount.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
    const cameraPos = domainDirectionToThreeJS(new THREE.Vector3(1, 1, 1).normalize());
    this.camera.position.set(cameraPos.x * 30, cameraPos.y * 30, cameraPos.z * 30);
    const up = domainDirectionToThreeJS(new THREE.Vector3(0, 0, 1));
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(0, 0, 0);

    this.renderer = this.platform.createRenderer(mount);
    this.renderer.setPixelRatio(this.platform.pixelRatio());
    this.labelRenderer = this.platform.createLabelRenderer();
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    mount.container.appendChild(this.labelRenderer.domElement);
    this.controls = this.platform.createControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 500;
    this.controls.maxPolarAngle = Math.PI;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);
    this.resize();
    this.animate();
  }

  resize(): void {
    if (!this.mounted || !this.camera || !this.renderer || !this.labelRenderer) return;
    const width = this.mounted.container.clientWidth;
    const height = this.mounted.container.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  dispose(): void {
    this.registry.dispose();
    this.disposePlatformResources();
  }

  private disposePlatformResources(): void {
    if (this.animationFrameId !== undefined) {
      this.platform.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.controls?.dispose();
    this.renderer?.dispose();
    this.labelRenderer?.domElement.remove();
    this.controls = undefined;
    this.renderer = undefined;
    this.labelRenderer = undefined;
    this.camera = undefined;
    this.mounted = undefined;
  }

  private animate = (): void => {
    this.animationFrameId = this.platform.requestAnimationFrame(this.animate);
    if (!this.camera || !this.renderer || !this.labelRenderer) return;
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };
}
