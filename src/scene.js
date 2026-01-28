import * as THREE from 'three';
import { TRAY } from './constants.js';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.physicallyCorrectLights = true;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1222');
  return scene;
}

export function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.01, 5);
  camera.position.set(0, 0.18, 0.25);
  camera.lookAt(0, 0.04, 0);
  return camera;
}

export function createLights(scene) {
  const ambientLight = new THREE.AmbientLight('#dbeafe', 0.3);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight('#c7d2fe', '#0f172a', 0.7);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);
  const directional = new THREE.DirectionalLight('#ffffff', 1.2);
  directional.position.set(6, 10, 6);
  directional.castShadow = true;
  directional.shadow.mapSize.set(2048, 2048);
  directional.shadow.bias = -0.00005;
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 40;
  directional.shadow.camera.left = -12;
  directional.shadow.camera.right = 12;
  directional.shadow.camera.top = 12;
  directional.shadow.camera.bottom = -12;
  scene.add(directional);
}

export function createTray(scene) {
  const trayGroup = new THREE.Group();
  const feltMaterial = new THREE.MeshPhysicalMaterial({ color: '#0f172a', roughness: 0.95, metalness: 0.02 });
  const wallMaterial = new THREE.MeshPhysicalMaterial({ color: '#111827', roughness: 0.8, metalness: 0.05 });
  const trayBase = new THREE.Mesh(new THREE.BoxGeometry(TRAY.halfWidth * 2, 0.002, TRAY.halfDepth * 2), feltMaterial);
  trayBase.receiveShadow = true;
  trayGroup.add(trayBase);
  const makeWall = (width, height, depth) => new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
  const wallHeight = TRAY.wallHeight;
  const wallThickness = TRAY.wallThickness;
  const wallNorth = makeWall(TRAY.halfWidth * 2 + wallThickness * 2, wallHeight, wallThickness);
  wallNorth.position.set(0, wallHeight / 2, TRAY.halfDepth + wallThickness / 2);
  const wallSouth = wallNorth.clone(); wallSouth.position.z = -TRAY.halfDepth - wallThickness / 2;
  const wallEast = makeWall(wallThickness, wallHeight, TRAY.halfDepth * 2 + wallThickness * 2);
  wallEast.position.set(TRAY.halfWidth + wallThickness / 2, wallHeight / 2, 0);
  const wallWest = wallEast.clone(); wallWest.position.x = -TRAY.halfWidth - wallThickness / 2;
  [wallNorth, wallSouth, wallEast, wallWest].forEach(w => { w.castShadow = true; w.receiveShadow = true; trayGroup.add(w); });
  trayGroup.position.y = 0;
  scene.add(trayGroup);
  return trayGroup;
}
