import * as THREE from 'three';
import { TRAY } from './constants.js';

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: true,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  // Enhanced shadow quality for raytraced look
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap; // Variance shadow maps for softer shadows
  
  // Color management and tone mapping for realistic lighting
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  // Enable physically correct lighting model
  renderer.useLegacyLights = false;
  
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0a0f18');
  scene.userData.renderer = renderer; // Store for PMREMGenerator
  return scene;
}

export function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 5);
  // Position camera for ~55 degree downward angle (steeper than 45)
  camera.position.set(0, 0.22, 0.15);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function createLights(scene) {
  // Subtle ambient for fill
  const ambientLight = new THREE.AmbientLight('#dbeafe', 0.15);
  scene.add(ambientLight);
  
  // Hemisphere light for natural sky/ground bounce
  const hemiLight = new THREE.HemisphereLight('#87ceeb', '#1a1a2e', 0.4);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);
  
  // Main key light - bright and directional for sharp shadows
  const keyLight = new THREE.DirectionalLight('#fff5e6', 2.5);
  keyLight.position.set(0.3, 0.8, 0.4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.radius = 3; // Soft shadow edges for VSM
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 3;
  keyLight.shadow.camera.left = -0.3;
  keyLight.shadow.camera.right = 0.3;
  keyLight.shadow.camera.top = 0.3;
  keyLight.shadow.camera.bottom = -0.3;
  scene.add(keyLight);
  
  // Fill light from opposite side - softer
  const fillLight = new THREE.DirectionalLight('#b3d9ff', 0.8);
  fillLight.position.set(-0.4, 0.5, -0.2);
  scene.add(fillLight);
  
  // Rim/back light for edge definition
  const rimLight = new THREE.DirectionalLight('#ffd4a3', 0.6);
  rimLight.position.set(0, 0.3, -0.5);
  scene.add(rimLight);
  
  // Add environment map for realistic reflections
  const pmremGenerator = new THREE.PMREMGenerator(scene.userData.renderer);
  pmremGenerator.compileEquirectangularShader();
  
  // Create a simple gradient environment
  const envScene = new THREE.Scene();
  const envMesh = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color('#1e3a5f') },
        bottomColor: { value: new THREE.Color('#0a0a12') },
        offset: { value: 0 },
        exponent: { value: 0.6 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `
    })
  );
  envScene.add(envMesh);
  
  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;
  pmremGenerator.dispose();
}

export function createTray(scene) {
  const trayGroup = new THREE.Group();
  
  // Enhanced felt material with subtle texture feel
  const feltMaterial = new THREE.MeshPhysicalMaterial({ 
    color: '#0d1520', 
    roughness: 0.92, 
    metalness: 0.0,
    clearcoat: 0.0,
    sheen: 0.3,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color('#1a2744'),
  });
  
  // Polished wood-like walls
  const wallMaterial = new THREE.MeshPhysicalMaterial({ 
    color: '#1a1f2e', 
    roughness: 0.35, 
    metalness: 0.0,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
    reflectivity: 0.5,
  });
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
