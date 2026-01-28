import { World, Vec3, SAPBroadphase, Material, ContactMaterial, Box, Body, Plane, Quaternion } from 'cannon-es';

const DIE_SIZES = { d6: 0.019 };
const DIE_MASSES = { d6: 0.005 };
const TRAY = { halfWidth: 0.08, halfDepth: 0.06 };
const cubeFaceNormals = [
  { normal: new Vec3( 1, 0, 0), value: 3 },
  { normal: new Vec3(-1, 0, 0), value: 4 },
  { normal: new Vec3( 0, 1, 0), value: 1 },
  { normal: new Vec3( 0,-1, 0), value: 2 },
  { normal: new Vec3( 0, 0, 1), value: 5 },
  { normal: new Vec3( 0, 0,-1), value: 6 }
];

const randRange = (min, max) => min + Math.random() * (max - min);
const gaussian = (mean = 0, sd = 1) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + sd * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
const randomVec3WithMagnitude = (min, max) => {
  const mag = randRange(min, max);
  const v = new Vec3(gaussian(), gaussian(), gaussian());
  v.normalize();
  v.scale(mag, v);
  return v;
};

function makeWorld() {
  const world = new World({ gravity: new Vec3(0, -9.82, 0) });
  world.broadphase = new SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = 20;
  world.solver.tolerance = 1e-4;
  world.defaultContactMaterial.friction = 0.78;
  world.defaultContactMaterial.restitution = 0.08;

  const diceMaterial = new Material('dice');
  const tableMaterial = new Material('table');
  world.addContactMaterial(new ContactMaterial(diceMaterial, tableMaterial, { friction: 0.78, restitution: 0.08 }));
  world.addContactMaterial(new ContactMaterial(diceMaterial, diceMaterial, { friction: 0.7, restitution: 0.08 }));

  // Floor
  const floorBody = new Body({ mass: 0, material: tableMaterial });
  floorBody.addShape(new Plane());
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floorBody);

  // Walls
  const bounds = { x: TRAY.halfWidth, z: TRAY.halfDepth };
  const wallShapes = [
    { pos: [ bounds.x, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [-bounds.x, 0, 0], rot: [0,  Math.PI / 2, 0] },
    { pos: [0, 0,  bounds.z], rot: [Math.PI, 0, 0] },
    { pos: [0, 0, -bounds.z], rot: [0, 0, 0] }
  ];
  wallShapes.forEach(({ pos, rot }) => {
    const wall = new Body({ mass: 0, material: tableMaterial });
    wall.addShape(new Plane());
    wall.position.set(...pos);
    wall.quaternion.setFromEuler(...rot);
    world.addBody(wall);
  });

  return { world, diceMaterial };
}

function createDieBody(diceMaterial) {
  const half = DIE_SIZES.d6 / 2;
  const shape = new Box(new Vec3(half, half, half));
  const body = new Body({ mass: DIE_MASSES.d6, shape, material: diceMaterial });
  // spawn left edge
  body.position.set(-TRAY.halfWidth + half * 2, half + 0.008, 0);
  body.quaternion.setFromEuler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
  body.linearDamping = 0.5;
  body.angularDamping = 0.6;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.15;
  body.sleepTimeLimit = 0.4;
  return body;
}

function applyImpulse(body) {
  const pos = body.position.clone();
  const target = new Vec3(0, pos.y, randRange(-TRAY.halfDepth * 0.3, TRAY.halfDepth * 0.3));
  const dir = target.vsub(pos);
  dir.y = 0;
  if (dir.lengthSquared() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const speed = randRange(0.6, 1.1);
  const vy = randRange(0.4, 0.8);
  body.velocity.set(dir.x * speed, vy, dir.z * speed);
  const angMag = randRange(3, 8);
  const w = randomVec3WithMagnitude(angMag, angMag * 1.3);
  body.angularVelocity.copy(w);
}

const CLAMP_DOT_THRESHOLD = 0.99;
const CLAMP_LIN_THRESHOLD = 0.05;
const CLAMP_ANG_THRESHOLD = 0.2;
const CLAMP_MIN_TIME = 1.0;
const CLAMP_STABLE_TIME = 0.2;
const CLAMP_VEL_STABLE_TIME = 0.5;

function applyGroundFriction(body, dt) {
  const half = DIE_SIZES.d6 / 2;
  const grounded = body.position.y - half < 0.003;
  if (!grounded) return;
  const horiz = new Vec3(body.velocity.x, 0, body.velocity.z);
  const speed = horiz.length();
  if (speed > 0) {
    const decel = 5;
    const drop = decel * dt;
    const newSpeed = Math.max(0, speed - drop);
    horiz.scale(newSpeed / speed, horiz);
    body.velocity.x = horiz.x;
    body.velocity.z = horiz.z;
  }
  const ang = body.angularVelocity.length();
  if (ang > 0) {
    const angDrop = 8 * dt;
    const scale = Math.max(0, 1 - angDrop);
    body.angularVelocity.scale(scale, body.angularVelocity);
  }
}
function detectTop(body) {
  const worldUp = new Vec3(0, 1, 0);
  let bestDot = -Infinity;
  let best = null;
  cubeFaceNormals.forEach(face => {
    const worldNormal = new Vec3();
    body.quaternion.vmult(face.normal, worldNormal);
    const dot = worldNormal.dot(worldUp);
    if (dot > bestDot) {
      bestDot = dot;
      best = { value: face.value, dot };
    }
  });
  return best;
}

function freezeBody(world, body) {
  const frozenPose = { position: body.position.clone(), quaternion: body.quaternion.clone() };
  const top = detectTop(body);
  const frozenResult = top || { value: Math.floor(randRange(0, 6)) + 1 };
  body.velocity.setZero();
  body.angularVelocity.setZero();
  body.collisionResponse = 0;
  body.type = Body.STATIC;
  body.mass = 0;
  body.updateMassProperties();
  body.allowSleep = false;
  body.sleepState = Body.SLEEPING;
  body.userData = { frozen: true, frozenPose, frozenResult };
  try { world.removeBody(body); body.userData.removed = true; } catch (e) {}
  return frozenResult;
}

function simulateOneTrial() {
  const { world, diceMaterial } = makeWorld();
  const body = createDieBody(diceMaterial);
  applyImpulse(body);
  world.addBody(body);
  const dt = 1/240;
  const MAX_ANG = 20;
  const MAX_LIN = 3;
  let t = 0;
  let stableTime = 0;
  let velStableTime = 0;
  let lastLog = 0;
  let maxAng = 0;
  let maxLin = 0;
  let timeToSleep = null;
  while (t < 8) {
    world.step(dt, dt, 1);
    const ang = body.angularVelocity.length();
    const lin = body.velocity.length();
      applyGroundFriction(body, dt);

    if (ang > MAX_ANG) body.angularVelocity.scale(MAX_ANG / ang, body.angularVelocity);
    if (lin > MAX_LIN) body.velocity.scale(MAX_LIN / lin, body.velocity);
    maxAng = Math.max(maxAng, ang);
    maxLin = Math.max(maxLin, lin);
    if (t > CLAMP_MIN_TIME) {
      const top = detectTop(body);
      const stable = top && top.dot > CLAMP_DOT_THRESHOLD && lin < CLAMP_LIN_THRESHOLD && ang < CLAMP_ANG_THRESHOLD;
      stableTime = stable ? stableTime + dt : 0;
      if (stable && stableTime >= CLAMP_STABLE_TIME) { freezeBody(world, body); timeToSleep = t; break; }
      const velStable = lin < CLAMP_LIN_THRESHOLD && ang < CLAMP_ANG_THRESHOLD;
      velStableTime = velStable ? velStableTime + dt : 0;
      if (t > 2 && velStableTime >= CLAMP_VEL_STABLE_TIME) { freezeBody(world, body); timeToSleep = t; break; }
      if (t > 3 && top && top.dot > 0.9 && lin < 0.2 && ang < 1.0) { freezeBody(world, body); timeToSleep = t; break; }
    }
    if (t - lastLog >= 0.5 - 1e-6) {
      console.log(`t=${t.toFixed(2)} lin=${lin.toFixed(3)} ang=${ang.toFixed(3)} stable=${stableTime.toFixed(2)} velStable=${velStableTime.toFixed(2)}`);
      lastLog = t;
    }
    t += dt;
  }
  return { timeToSleep, maxAng, maxLin, finalAng: body.angularVelocity.length(), finalLin: body.velocity.length() };
}

const result = simulateOneTrial();
console.log(`trial`, result);
