import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { COLOR_FACES, DIE_SIZES } from './constants.js';

function createD10Geometry() {
  const { radius, height } = DIE_SIZES.d10;
  const top = new THREE.Vector3(0, height / 2, 0);
  const bottom = new THREE.Vector3(0, -height / 2, 0);
  const ring = Array.from({ length: 5 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
  const positions = [];
  for (let i = 0; i < ring.length; i += 1) {
    const next = (i + 1) % ring.length;
    positions.push(
      top.x, top.y, top.z,
      ring[next].x, ring[next].y, ring[next].z,
      ring[i].x, ring[i].y, ring[i].z,
      bottom.x, bottom.y, bottom.z,
      ring[i].x, ring[i].y, ring[i].z,
      ring[next].x, ring[next].y, ring[next].z,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export const diceCatalog = {
  d6: {
    label: 'd6 (poker)',
    sides: 6,
    color: '#38bdf8',
    geometry: () => new RoundedBoxGeometry(DIE_SIZES.d6, DIE_SIZES.d6, DIE_SIZES.d6, 5, DIE_SIZES.d6 * 0.12)
  },
  color: {
    label: 'Color die',
    sides: 6,
    geometry: () => new RoundedBoxGeometry(DIE_SIZES.color, DIE_SIZES.color, DIE_SIZES.color, 5, DIE_SIZES.color * 0.12),
    faceColors: COLOR_FACES
  },
  d8: {
    label: 'd8',
    sides: 8,
    color: '#a855f7',
    geometry: () => new THREE.OctahedronGeometry(DIE_SIZES.d8 / Math.SQRT2)
  },
  d10: {
    label: 'd10',
    sides: 10,
    color: '#ec4899',
    geometry: createD10Geometry
  },
  d12: {
    label: 'd12',
    sides: 12,
    color: '#eab308',
    geometry: () => new THREE.DodecahedronGeometry(DIE_SIZES.d12 * 0.5)
  },
  d20: {
    label: 'd20',
    sides: 20,
    color: '#f97316',
    geometry: () => new THREE.IcosahedronGeometry(DIE_SIZES.d20 * 0.5)
  }
};
