import * as THREE from 'three';
import { secureRandomInt } from './random.js';
import { DIE_SIZES } from './constants.js';

export function makeFaceTexture(renderer, label, options = {}) {
  const { background = '#111827', color = '#f8fafc' } = options;
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.font = 'bold 260px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(15,23,42,0.45)';
  ctx.shadowBlur = 12;
  ctx.fillText(label, size / 2, size / 2 + 20);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 4);
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createBoxMaterials(renderer, definition) {
  if (definition.faceColors) {
    return [0,1,2,3,4,5].map(i => new THREE.MeshPhysicalMaterial({
      map: makeFaceTexture(renderer, '', { background: definition.faceColors[i].color, color: '#0f172a' }),
      roughness: 0.25,
      metalness: 0.0,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      reflectivity: 0.8,
      envMapIntensity: 1.2,
    }));
  }
  const labels = ['3','4','1','2','5','6'];
  return labels.map(label => new THREE.MeshPhysicalMaterial({
    map: makeFaceTexture(renderer, label, { background: definition.color || '#1e3a8a' }),
    roughness: 0.25,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.15,
    reflectivity: 0.8,
    envMapIntensity: 1.2,
  }));
}

export function buildMaterials(renderer, definition) {
  if (definition.sides === 6 || definition.label?.includes('Color')) {
    return createBoxMaterials(renderer, definition);
  }
  const baseColor = definition.color || '#38bdf8';
  const highlight = new THREE.Color(baseColor).offsetHSL(0, 0, 0.12).getStyle();
  return [
    new THREE.MeshPhysicalMaterial({ 
      color: baseColor, 
      roughness: 0.28, 
      metalness: 0.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      reflectivity: 0.7,
      envMapIntensity: 1.0,
    }),
    new THREE.MeshPhysicalMaterial({ 
      color: highlight, 
      roughness: 0.28, 
      metalness: 0.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      reflectivity: 0.7,
      envMapIntensity: 1.0,
    })
  ];
}

export function attachFaceLabels(mesh, definition, labelSize = 0.012) {
  const geom = mesh.geometry.clone();
  const posAttr = geom.toNonIndexed().getAttribute('position');
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
    const mat = new THREE.MeshPhysicalMaterial({
      map: makeFaceTexture(renderer, String(idx + 1)),
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.25,
      metalness: 0.0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
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
          roughness: 0.28, 
          metalness: 0.0,
          clearcoat: 0.5,
          clearcoatRoughness: 0.2,
          reflectivity: 0.7,
          envMapIntensity: 1.0,
        })
      : materials[0];

  const mesh = new THREE.Mesh(geometry, material);
  geometry.computeBoundingBox();
  const sizeVec = new THREE.Vector3();
  geometry.boundingBox.getSize(sizeVec);
  const halfHeight = sizeVec.y / 2;
  const spawnMargin = sizeVec.x * 1.2;
  const spawnX = -DIE_SIZES.d6; // left side
  const spacing = sizeVec.z * 1.6;
  mesh.position.set(
    spawnX + (index * sizeVec.x * 0.2),
    halfHeight + 0.008,
    (index - (total - 1) / 2) * spacing * 0.5
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.halfHeight = halfHeight;

  if (!(definition.sides === 6 || definition.label?.includes('Color'))) {
    const labelSize = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) * 0.35;
    attachFaceLabels(mesh, definition, labelSize);
  }
  return mesh;
}
