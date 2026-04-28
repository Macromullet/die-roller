import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { TRAY } from './constants.js';

function makeNoiseTexture(draw) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createFeltTexture() {
  const texture = makeNoiseTexture((ctx, size) => {
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 8000; i += 1) {
      const alpha = Math.random() * 0.035;
      const shade = Math.random() > 0.5 ? 90 : 24;
      ctx.fillStyle = `rgba(${shade}, ${shade + 4}, ${shade + 10}, ${alpha})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, Math.random() * 3 + 1);
    }
  });
  texture.repeat.set(2.5, 2);
  return texture;
}

function createWoodTexture() {
  const texture = makeNoiseTexture((ctx, size) => {
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, '#141824');
    gradient.addColorStop(0.5, '#25202b');
    gradient.addColorStop(1, '#121722');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 7) {
      ctx.strokeStyle = `rgba(255, 198, 132, ${0.035 + Math.random() * 0.035})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y + Math.sin(y * 0.08) * 3);
      ctx.bezierCurveTo(size * 0.35, y + 8, size * 0.65, y - 8, size, y + Math.cos(y * 0.05) * 4);
      ctx.stroke();
    }
  });
  texture.repeat.set(1.8, 0.8);
  return texture;
}

function createContactShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.48);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.48)');
  gradient.addColorStop(0.42, 'rgba(0, 0, 0, 0.22)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addEnvironmentCard(scene, position, rotation, size, color, intensity) {
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(size[0], size[1]),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    })
  );
  card.position.set(...position);
  card.rotation.set(...rotation);
  scene.add(card);
  return card;
}

function createStudioEnvironment(renderer) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#05070b');

  const room = new THREE.Mesh(
    new THREE.SphereGeometry(12, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color('#1d2430') },
        horizonColor: { value: new THREE.Color('#10141c') },
        bottomColor: { value: new THREE.Color('#030406') },
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
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y * 0.5 + 0.5;
          vec3 lower = mix(bottomColor, horizonColor, smoothstep(0.0, 0.52, h));
          vec3 upper = mix(horizonColor, topColor, smoothstep(0.5, 1.0, h));
          gl_FragColor = vec4(mix(lower, upper, smoothstep(0.42, 0.8, h)), 1.0);
        }
      `,
    })
  );
  envScene.add(room);

  addEnvironmentCard(envScene, [-2.0, 2.4, -1.4], [0.18, -0.75, 0.25], [1.7, 1.1], '#f8f8f8', 1.0);
  addEnvironmentCard(envScene, [1.8, 1.2, 1.5], [0.12, 0.75, -0.2], [1.2, 0.8], '#d8d8d8', 0.12);
  addEnvironmentCard(envScene, [0.0, 2.0, -2.1], [0.55, 0, 0], [1.4, 0.7], '#e6e6e6', 0.14);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envMap = pmremGenerator.fromScene(envScene, 0.12).texture;
  pmremGenerator.dispose();
  return envMap;
}

export function createRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true, 
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.68;
  renderer.useLegacyLights = false;
  container.appendChild(renderer.domElement);
  return renderer;
}

export function createScene(renderer) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080d14');
  scene.userData.renderer = renderer;
  return scene;
}

export function createCamera(container) {
  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.01, 5);
  camera.position.set(0.006, 0.175, 0.17);
  camera.lookAt(0.003, 0.007, 0);
  return camera;
}

export function createLights(scene) {
  RectAreaLightUniformsLib.init();
  scene.environment = createStudioEnvironment(scene.userData.renderer);
  scene.environmentIntensity = 0.18;

  const ambientLight = new THREE.AmbientLight('#f2f2f2', 0.025);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight('#f3f3f3', '#08090c', 0.06);
  hemiLight.position.set(0, 10, 0);
  scene.add(hemiLight);

  const keyArea = new THREE.RectAreaLight('#f7f7f7', 4.4, 0.18, 0.12);
  keyArea.position.set(-0.12, 0.28, -0.14);
  keyArea.lookAt(0.01, 0.01, 0);
  scene.add(keyArea);

  const coolFill = new THREE.RectAreaLight('#d9d9d9', 0.08, 0.18, 0.14);
  coolFill.position.set(0.18, 0.13, 0.16);
  coolFill.lookAt(0, 0.005, 0);
  scene.add(coolFill);

  const keyLight = new THREE.SpotLight('#f5f5f5', 24, 0.8, Math.PI / 8, 0.68, 1.8);
  keyLight.position.set(-0.14, 0.34, -0.16);
  keyLight.target.position.set(0.015, 0, -0.01);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.bias = -0.00002;
  keyLight.shadow.normalBias = 0.006;
  keyLight.shadow.camera.near = 0.04;
  keyLight.shadow.camera.far = 0.8;
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight('#e0e0e0', 0.08);
  rimLight.position.set(0.02, 0.16, -0.28);
  scene.add(rimLight);
}

export function createTray(scene) {
  const trayGroup = new THREE.Group();

  const feltMaterial = new THREE.MeshPhysicalMaterial({ 
    color: '#06080d',
    map: createFeltTexture(),
    roughness: 1.0, 
    metalness: 0.0,
    clearcoat: 0.0,
    sheen: 0.18,
    sheenRoughness: 1.0,
    sheenColor: new THREE.Color('#111827'),
  });

  const wallMaterial = new THREE.MeshPhysicalMaterial({ 
    color: '#1a1f2e',
    map: createWoodTexture(),
    roughness: 0.38, 
    metalness: 0.0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.28,
    reflectivity: 0.36,
  });

  const trayBase = new THREE.Mesh(new THREE.BoxGeometry(TRAY.halfWidth * 2, 0.0025, TRAY.halfDepth * 2), feltMaterial);
  trayBase.receiveShadow = true;
  trayBase.position.y = -0.0004;
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

  const tableMaterial = new THREE.MeshPhysicalMaterial({
    color: '#05070b',
    roughness: 0.7,
    metalness: 0.0,
    envMapIntensity: 0.35,
  });
  const table = new THREE.Mesh(new THREE.BoxGeometry(TRAY.halfWidth * 2.5, 0.003, TRAY.halfDepth * 2.5), tableMaterial);
  table.position.y = -0.004;
  table.receiveShadow = true;
  trayGroup.add(table);

  trayGroup.position.y = 0;
  scene.add(trayGroup);
  return trayGroup;
}

export function createContactShadow() {
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.04, 0.04),
    new THREE.MeshBasicMaterial({
      map: createContactShadowTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.0002;
  shadow.renderOrder = 1;
  return shadow;
}

export function updateContactShadow(shadow, body) {
  if (!shadow || !body) return;
  const halfHeight = body.userData?.halfHeight ?? 0.01;
  const height = Math.max(0, body.position.y - halfHeight);
  const fade = Math.max(0, Math.min(1, 1 - height / 0.05));
  const size = Math.max(halfHeight * 3.5, 0.034) * (1 + height * 10);
  shadow.position.x = body.position.x;
  shadow.position.z = body.position.z;
  shadow.scale.set(size / 0.04, size / 0.04, 1);
  shadow.material.opacity = 0.42 * fade;
}
