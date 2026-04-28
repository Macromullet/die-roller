import assert from 'node:assert/strict';
import * as THREE from 'three';
import { diceCatalog } from '../src/diceCatalog.js';
import { createWorld, createDieBody, applyImpulse, applyGroundFriction } from '../src/physics.js';
import { createRollPlan, updateRollEngine, forceFinishRoll } from '../src/rollEngine.js';
import { TIMESTEP, ROLL } from '../src/constants.js';

function getFaceGroups(geometry) {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute('position');
  const seen = new Map();
  const keyForNormal = (normal) => `${Math.round(normal.x * 20)}/${Math.round(normal.y * 20)}/${Math.round(normal.z * 20)}`;

  for (let index = 0; index < positions.count; index += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, index);
    const b = new THREE.Vector3().fromBufferAttribute(positions, index + 1);
    const c = new THREE.Vector3().fromBufferAttribute(positions, index + 2);
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    const key = keyForNormal(normal);
    if (!seen.has(key)) seen.set(key, normal.clone());
  }

  return Array.from(seen.values(), (normal, index) => ({ normal, value: index + 1 }));
}

for (const [type, definition] of Object.entries(diceCatalog)) {
  const geometry = definition.geometry();
  geometry.computeBoundingBox();
  const mesh = new THREE.Mesh(geometry);
  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);
  mesh.userData.halfHeight = size.y / 2;
  mesh.position.set(-0.04, mesh.userData.halfHeight + 0.014, 0);
  mesh.rotation.set(0.3, 0.7, 0.2);

  if (!(definition.sides === 6 || definition.label?.includes('Color'))) {
    mesh.userData.faceGroups = getFaceGroups(geometry);
  }

  const { world, diceMaterial } = createWorld();
  const body = createDieBody(definition, mesh, type, diceMaterial);
  createRollPlan(body, mesh);
  applyImpulse(body, 0, 1);
  world.addBody(body);

  let elapsed = 0;
  let allRested = false;
  while (elapsed < ROLL.maxDuration && !allRested) {
    world.step(TIMESTEP.fixed, TIMESTEP.fixed, 1);
    if (body.userData.roll.phase === 'physics') {
      applyGroundFriction(body, TIMESTEP.fixed);
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    }
    allRested = updateRollEngine(world, [body], [mesh], elapsed, TIMESTEP.fixed);
    elapsed += TIMESTEP.fixed;
  }

  if (!allRested) {
    forceFinishRoll(world, [body], [mesh]);
  }

  assert.equal(body.userData.roll.phase, 'rested', `${type} did not finish`);
  assert.ok(body.userData.roll.result, `${type} did not report a result`);
  assert.ok(
    body.userData.roll.result.value >= 1 && body.userData.roll.result.value <= definition.sides,
    `${type} reported an out-of-range result`
  );
  assert.equal(mesh.position.distanceTo(body.position), 0, `${type} mesh moved away from body`);
}
