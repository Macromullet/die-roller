import * as THREE from 'three';
import { ROLL } from './constants.js';
import { cubeFaceNormals } from './faces.js';

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const toThreeVector = (vector) => new THREE.Vector3(vector.x, vector.y, vector.z);
const toThreeQuaternion = (quaternion) => new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);

export function createRollPlan(body) {
  body.userData.roll = {
    phase: 'physics',
    stableTime: 0,
    result: null,
  };
}

export function updateRollEngine(world, bodies, meshes, elapsed, delta = 1 / 60) {
  let allRested = bodies.length > 0;

  bodies.forEach((body, index) => {
    const mesh = meshes[index];
    const roll = body.userData?.roll;
    if (!roll || !mesh) return;

    if (roll.phase !== 'rested') {
      const stable = isStable(body);
      roll.stableTime = stable ? roll.stableTime + delta : 0;

      if (elapsed >= ROLL.minDuration && roll.stableTime >= ROLL.stableTime) {
        finishAtCurrentPose(world, body, mesh);
      }
    }

    if (roll.phase === 'rested') {
      applyFinalPose(body, mesh);
    } else {
      allRested = false;
    }
  });

  return allRested;
}

export function forceFinishRoll(world, bodies, meshes) {
  bodies.forEach((body, index) => {
    const mesh = meshes[index];
    const roll = body.userData?.roll;
    if (!roll || !mesh || roll.phase === 'rested') return;
    finishAtCurrentPose(world, body, mesh);
  });
}

function isStable(body) {
  const result = detectResult(body);
  return Boolean(
    result
      && result.dot >= ROLL.stableFaceDot
      && body.velocity.length() <= ROLL.stableLinearSpeed
      && body.angularVelocity.length() <= ROLL.stableAngularSpeed
  );
}

function finishAtCurrentPose(world, body, mesh) {
  if (body.world === world) world.removeBody(body);
  body.velocity.setZero();
  body.angularVelocity.setZero();
  mesh.position.copy(body.position);
  mesh.quaternion.copy(body.quaternion);

  const roll = body.userData.roll;
  roll.phase = 'rested';
  roll.result = detectResult(body);
  roll.position = body.position.clone();
  roll.quaternion = body.quaternion.clone();
  mesh.userData.frozen = true;
}

function applyFinalPose(body, mesh) {
  const roll = body.userData.roll;
  body.position.copy(roll.position);
  body.quaternion.copy(roll.quaternion);
  mesh.position.copy(roll.position);
  mesh.quaternion.copy(roll.quaternion);
}

function detectResult(body) {
  const type = body.userData?.dieType;
  if (type === 'd6' || type === 'color') {
    return detectCubeResult(body, type);
  }

  if (body.userData?.faceGroups) {
    return detectFaceGroupResult(body, body.userData.faceGroups);
  }

  return { value: 1, dot: 1 };
}

function detectCubeResult(body, type) {
  let best = null;
  const quaternion = toThreeQuaternion(body.quaternion);

  cubeFaceNormals.forEach((face) => {
    const worldNormal = toThreeVector(face.normal).applyQuaternion(quaternion);
    const dot = worldNormal.dot(WORLD_UP);
    if (!best || dot > best.dot) {
      best = {
        value: face.value,
        dot,
        ...(type === 'color' ? { colorIndex: face.colorIndex } : {}),
      };
    }
  });

  return best;
}

function detectFaceGroupResult(body, faceGroups) {
  let best = null;
  const quaternion = toThreeQuaternion(body.quaternion);

  faceGroups.forEach((face) => {
    const worldNormal = toThreeVector(face.normal).applyQuaternion(quaternion);
    const dot = worldNormal.dot(WORLD_UP);
    if (!best || dot > best.dot) {
      best = { value: face.value, dot };
    }
  });

  return best;
}
