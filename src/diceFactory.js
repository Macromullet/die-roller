import * as THREE from 'three';
import { secureRandomInt } from './random.js';
import { DIE_SIZES, TRAY } from './constants.js';

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function makeCanvasTexture(renderer, draw) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy?.() || 4);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function makeFaceTexture(renderer, label, options = {}) {
  const {
    background = '#111827',
    color = '#f8fafc',
    transparent = false,
    fontSize = 250,
    yOffset = 18,
    stroke = 'rgba(5, 10, 18, 0.92)',
    strokeWidth = 18,
  } = options;

  return makeCanvasTexture(renderer, (ctx, size) => {
    if (!transparent) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.fillStyle = color;
    ctx.font = `800 ${fontSize}px Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = transparent ? 'rgba(0,0,0,0.9)' : 'rgba(15,23,42,0.45)';
    ctx.shadowBlur = transparent ? 16 : 12;
    ctx.shadowOffsetY = transparent ? 4 : 0;
    if (strokeWidth > 0) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = stroke;
      ctx.strokeText(label, size / 2, size / 2 + yOffset);
    }
    ctx.fillText(label, size / 2, size / 2 + yOffset);
  });
}

function makePipTexture(renderer, value, faceIndex) {
  const pipLayouts = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  };
  const pipColor = '#020202';
  const faceTints = [
    ['#f3dec0', '#d6bb8f', '#a9875d'],
    ['#ead2aa', '#c7aa7a', '#95754f'],
    ['#f5e6c8', '#dec89c', '#b28f62'],
    ['#d9c29b', '#b99a6c', '#806244'],
    ['#f0d6ae', '#c9a677', '#96704d'],
    ['#e3caa1', '#b89566', '#7f6040'],
  ];
  const tint = faceTints[faceIndex] ?? faceTints[0];

  return makeCanvasTexture(renderer, (ctx, size) => {
    const faceGradient = ctx.createRadialGradient(size * 0.38, size * 0.28, size * 0.08, size * 0.5, size * 0.5, size * 0.72);
    faceGradient.addColorStop(0, tint[0]);
    faceGradient.addColorStop(0.62, tint[1]);
    faceGradient.addColorStop(1, tint[2]);
    ctx.fillStyle = faceGradient;
    ctx.fillRect(0, 0, size, size);

    roundedRect(ctx, 34, 34, size - 68, size - 68, 58);
    ctx.strokeStyle = 'rgba(80, 56, 35, 0.2)';
    ctx.lineWidth = 10;
    ctx.stroke();

    const insetGradient = ctx.createLinearGradient(0, 0, size, size);
    insetGradient.addColorStop(0, 'rgba(255,255,255,0.5)');
    insetGradient.addColorStop(1, 'rgba(90,60,35,0.22)');
    roundedRect(ctx, 54, 54, size - 108, size - 108, 42);
    ctx.strokeStyle = insetGradient;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.fillStyle = pipColor;
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    const spacing = size * 0.23;
    const radius = size * 0.071;
    pipLayouts[value].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(size / 2 + x * spacing, size / 2 + y * spacing, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function makeColorFaceTexture(renderer, face) {
  return makeCanvasTexture(renderer, (ctx, size) => {
    ctx.fillStyle = face.color;
    ctx.fillRect(0, 0, size, size);
    roundedRect(ctx, 36, 36, size - 72, size - 72, 46);
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 14;
    ctx.stroke();
  });
}

export function createBoxMaterials(renderer, definition) {
  if (definition.faceColors) {
    return [0,1,2,3,4,5].map(i => new THREE.MeshPhysicalMaterial({
      map: makeColorFaceTexture(renderer, definition.faceColors[i]),
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.0,
      clearcoatRoughness: 1.0,
      reflectivity: 0.0,
      envMapIntensity: 0.0,
    }));
  }
  const labels = [3, 4, 1, 2, 5, 6];
  return labels.map((value, index) => new THREE.MeshPhysicalMaterial({
    map: makePipTexture(renderer, value, index),
    roughness: 0.6,
    metalness: 0.0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.74,
    reflectivity: 0.18,
    envMapIntensity: 0.14,
  }));
}

export function buildMaterials(renderer, definition) {
  if (definition.sides === 6 || definition.label?.includes('Color')) {
    return createBoxMaterials(renderer, definition);
  }
  const baseColor = definition.color || '#38bdf8';
  const highlight = new THREE.Color(baseColor).offsetHSL(0, 0.03, 0.12).getStyle();
  return [
    new THREE.MeshPhysicalMaterial({ 
      color: baseColor, 
      roughness: 0.58, 
      metalness: 0.0,
      clearcoat: 0.18,
      clearcoatRoughness: 0.68,
      reflectivity: 0.24,
      envMapIntensity: 0.22,
    }),
    new THREE.MeshPhysicalMaterial({ 
      color: highlight, 
      roughness: 0.58, 
      metalness: 0.0,
      clearcoat: 0.18,
      clearcoatRoughness: 0.68,
      reflectivity: 0.24,
      envMapIntensity: 0.22,
    })
  ];
}

export function attachFaceLabels(mesh, definition, labelSize = 0.012) {
  const geom = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const posAttr = geom.getAttribute('position');
  const faces = [];
  for (let i = 0; i < posAttr.count; i += 3) {
    const vA = new THREE.Vector3().fromBufferAttribute(posAttr, i);
    const vB = new THREE.Vector3().fromBufferAttribute(posAttr, i + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(posAttr, i + 2);
    const center = new THREE.Vector3().addVectors(vA, vB).add(vC).multiplyScalar(1 / 3);
    const normal = new THREE.Vector3().subVectors(vB, vA).cross(new THREE.Vector3().subVectors(vC, vA)).normalize();
    faces.push({ center, normal });
  }
  const groups = [];
  const normKey = (n) => `${Math.round(n.x * 20)}/${Math.round(n.y * 20)}/${Math.round(n.z * 20)}`;
  const seen = new Map();
  faces.forEach(f => {
    const key = normKey(f.normal);
    if (!seen.has(key)) {
      seen.set(key, { normal: f.normal.clone(), centers: [f.center.clone()] });
    } else {
      seen.get(key).centers.push(f.center.clone());
    }
  });
  seen.forEach(group => {
    const avgCenter = group.centers.reduce((acc, c) => acc.add(c), new THREE.Vector3()).multiplyScalar(1 / group.centers.length);
    groups.push({ normal: group.normal.normalize(), center: avgCenter });
  });
  groups.forEach((g, idx) => {
    const planeGeom = new THREE.PlaneGeometry(labelSize, labelSize);
    const mat = new THREE.MeshBasicMaterial({
      map: makeFaceTexture(renderer, String(idx + 1), {
        transparent: true,
        color: '#fff7ed',
        fontSize: 210,
        yOffset: 14,
        stroke: 'rgba(2, 6, 23, 0.98)',
        strokeWidth: 26,
      }),
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.04,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    const label = new THREE.Mesh(planeGeom, mat);
    label.position.copy(g.center.clone().add(g.normal.clone().multiplyScalar(labelSize * 0.6)));
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(new THREE.Vector3(0,0,0), g.normal, new THREE.Vector3(0,1,0));
    label.quaternion.setFromRotationMatrix(lookAtMatrix);
    mesh.add(label);
  });
  mesh.userData.faceGroups = groups.map((g, idx) => ({ normal: g.normal.clone().normalize(), value: idx + 1 }));
}

export function createDieMesh(definition, index, total, type, renderer) {
  const geometry = definition.geometry();
  const materials = buildMaterials(renderer, definition);
  const material = Array.isArray(materials) && materials.length > 2
    ? materials
    : materials.length === 2
      ? new THREE.MeshPhysicalMaterial({ 
          color: materials[secureRandomInt(2)].color, 
          roughness: 0.64, 
          metalness: 0.0,
          clearcoat: 0.1,
          clearcoatRoughness: 0.76,
          reflectivity: 0.18,
          envMapIntensity: 0.18,
        })
      : materials[0];

  const mesh = new THREE.Mesh(geometry, material);
  geometry.computeBoundingBox();
  const sizeVec = new THREE.Vector3();
  geometry.boundingBox.getSize(sizeVec);
  const halfHeight = sizeVec.y / 2;
  const laneCount = Math.max(1, total - 1);
  const usableDepth = TRAY.halfDepth * 1.45;
  const spacing = Math.min(sizeVec.z * 1.45, usableDepth / laneCount);
  const spawnX = -TRAY.halfWidth + Math.max(sizeVec.x, DIE_SIZES.d6) * 1.7;
  mesh.position.set(
    spawnX + (index % 3) * sizeVec.x * 0.2,
    halfHeight + 0.014 + (index % 2) * sizeVec.y * 0.2,
    (index - (total - 1) / 2) * spacing
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.halfHeight = halfHeight;
  addEdgeHighlights(mesh, type);

  if (!(definition.sides === 6 || definition.label?.includes('Color'))) {
    const labelSize = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) * 0.44;
    attachFaceLabels(mesh, definition, labelSize);
  }
  return mesh;
}

function addEdgeHighlights(mesh, type) {
  const edgeColor = type === 'd6' || type === 'color' ? '#3f3426' : '#fff7ed';
  const edgeOpacity = type === 'd6' || type === 'color' ? 0.08 : 0.14;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 32),
    new THREE.LineBasicMaterial({
      color: edgeColor,
      transparent: true,
      opacity: edgeOpacity,
      depthWrite: false,
    })
  );
  mesh.add(edges);
}
