import * as CANNON from 'cannon-es';
import { secureRandomInt } from './random.js';
import { FREEZE } from './constants.js';

export const cubeFaceNormals = [
  { normal: new CANNON.Vec3( 1, 0, 0), value: 3, colorIndex: 0 },
  { normal: new CANNON.Vec3(-1, 0, 0), value: 4, colorIndex: 1 },
  { normal: new CANNON.Vec3( 0, 1, 0), value: 1, colorIndex: 2 },
  { normal: new CANNON.Vec3( 0,-1, 0), value: 2, colorIndex: 3 },
  { normal: new CANNON.Vec3( 0, 0, 1), value: 5, colorIndex: 4 },
  { normal: new CANNON.Vec3( 0, 0,-1), value: 6, colorIndex: 5 }
];

export function detectCubeValue(body) {
  const worldUp = new CANNON.Vec3(0, 1, 0);
  let bestDot = -Infinity;
  let best = null;
  cubeFaceNormals.forEach(face => {
    const worldNormal = new CANNON.Vec3();
    body.quaternion.vmult(face.normal, worldNormal);
    const dot = worldNormal.dot(worldUp);
    if (dot > bestDot) {
      bestDot = dot;
      best = { ...face, dot };
    }
  });
  return best;
}

export function detectResult(body, definition, type) {
  if (type === 'd6' || type === 'color') {
    return detectCubeValue(body);
  }
  if (body.userData.faceGroups) {
    const worldUp = new CANNON.Vec3(0, 1, 0);
    let bestDot = -Infinity;
    let bestVal = null;
    body.userData.faceGroups.forEach(fg => {
      const worldNormal = new CANNON.Vec3();
      body.quaternion.vmult(fg.normal, worldNormal);
      const dot = worldNormal.dot(worldUp);
      if (dot > bestDot) {
        bestDot = dot;
        bestVal = fg.value;
      }
    });
    if (bestVal != null) return { value: bestVal, dot: bestDot };
  }
  return null;
}

export function detectTop(body, definition, type) {
  if (type === 'd6' || type === 'color') {
    const best = detectCubeValue(body);
    return best ? { value: best.value, dot: best.dot } : null;
  }
  return detectResult(body, definition, type);
}

export function freezeBody(world, body, mesh, definition, type) {
  if (body.userData?.frozen) return;
  const frozenPose = { position: body.position.clone(), quaternion: body.quaternion.clone() };
  const top = detectTop(body, definition, type);
  const frozenResult = top || { value: secureRandomInt(definition.sides) + 1 };

  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.collisionResponse = 0;
  body.type = CANNON.Body.STATIC;
  body.mass = 0;
  body.updateMassProperties();
  body.allowSleep = false;
  body.sleepState = CANNON.Body.SLEEPING;
  body.userData.frozen = true;
  body.userData.frozenPose = frozenPose;
  body.userData.frozenResult = frozenResult;
  try { world.removeBody(body); body.userData.removed = true; } catch (e) {}

  if (mesh) {
    mesh.userData.frozen = true;
    mesh.position.copy(frozenPose.position);
    mesh.quaternion.copy(frozenPose.quaternion);
  }
}

export function isStable(body, definition, type, lin, ang) {
  const top = detectTop(body, definition, type);
  if (!top) return { stable: false, top: null };
  const stable = top.dot > FREEZE.dotStable && lin < FREEZE.linStable && ang < FREEZE.angStable;
  return { stable, top };
}
