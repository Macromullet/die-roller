import * as THREE from 'three';
import { COLOR_FACES, DIE_SIZES } from './constants.js';

export const diceCatalog = {
  d6: {
    label: 'd6 (poker)',
    sides: 6,
    color: '#38bdf8',
    geometry: () => new THREE.BoxGeometry(DIE_SIZES.d6, DIE_SIZES.d6, DIE_SIZES.d6)
  },
  color: {
    label: 'Color die',
    sides: 6,
    geometry: () => new THREE.BoxGeometry(DIE_SIZES.color, DIE_SIZES.color, DIE_SIZES.color),
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
    geometry: () => new THREE.CylinderGeometry(DIE_SIZES.d10.radius, DIE_SIZES.d10.radius, DIE_SIZES.d10.height, 10, 1, false)
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
