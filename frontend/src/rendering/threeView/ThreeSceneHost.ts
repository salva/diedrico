import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { domainDirectionToThreeJS } from '@/utils/threeUtils';
import { ThreeObjectRegistry } from './ThreeObjectRegistry';

export interface ThreeSceneHostMount { container: HTMLElement; canvas: HTMLCanvasElement }

export class ThreeSceneHost {
  readonly scene = new THREE.Scene();
  readonly registry = new ThreeObjectRegistry(this.scene);
  private camera?: THREE.PerspectiveCamera;
  private renderer?: THREE.WebGLRenderer;
  private labelRenderer?: CSS2DRenderer;
  private controls?: OrbitControls;
  private animationFrameId?: number;
  private mounted?: ThreeSceneHostMount;

  mount(mount: ThreeSceneHostMount): void {
    this.mounted = mount;
    this.scene.background = new THREE.Color(0xf5f5f5);
    const aspect = mount.container.clientWidth / Math.max(1, mount.container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
    const cameraPos = domainDirectionToThreeJS(new THREE.Vector3(1, 1, 1).normalize());
    this.camera.position.set(cameraPos.x * 30, cameraPos.y * 30, cameraPos.z * 30);
    const up = domainDirectionToThreeJS(new THREE.Vector3(0, 0, 1));
    this.camera.up.set(up.x, up.y, up.z);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: mount.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    mount.container.appendChild(this.labelRenderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
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
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.registry.dispose();
    this.controls?.dispose();
    this.renderer?.dispose();
    this.labelRenderer?.domElement.remove();
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    if (!this.camera || !this.renderer || !this.labelRenderer) return;
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  };
}
