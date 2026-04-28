import * as CANNON from 'cannon-es';
import { TRAY, DIE_SIZES, DIE_MASSES, WORLD, FRICTION, ROLL } from './constants.js';
import { randRange, randomVec3WithMagnitude } from './random.js';

export function createWorld() {
  const world = new CANNON.World({ gravity: new CANNON.Vec3(WORLD.gravity.x, WORLD.gravity.y, WORLD.gravity.z) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  world.solver.iterations = WORLD.solverIterations;
  world.solver.tolerance = WORLD.solverTolerance;
  world.defaultContactMaterial.friction = WORLD.defaultFriction;
  world.defaultContactMaterial.restitution = WORLD.defaultRestitution;

  const diceMaterial = new CANNON.Material('dice');
  const tableMaterial = new CANNON.Material('table');
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, tableMaterial, {
    friction: WORLD.diceTableFriction,
    restitution: WORLD.diceTableRestitution,
  }));
  world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: WORLD.diceDiceFriction,
    restitution: WORLD.diceDiceRestitution,
  }));

  const floorBody = new CANNON.Body({ mass: 0, material: tableMaterial });
  floorBody.addShape(new CANNON.Plane());
  floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floorBody);

  const bounds = { x: TRAY.halfWidth, z: TRAY.halfDepth };
  const wallShapes = [
    { pos: [ bounds.x, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { pos: [-bounds.x, 0, 0], rot: [0,  Math.PI / 2, 0] },
    { pos: [0, 0,  bounds.z], rot: [Math.PI, 0, 0] },
    { pos: [0, 0, -bounds.z], rot: [0, 0, 0] }
  ];
  wallShapes.forEach(({ pos, rot }) => {
    const wall = new CANNON.Body({ mass: 0, material: tableMaterial });
    wall.addShape(new CANNON.Plane());
    wall.position.set(...pos);
    wall.quaternion.setFromEuler(...rot);
    world.addBody(wall);
  });

  return { world, diceMaterial };
}

export function createDieBody(definition, mesh, type, diceMaterial) {
  let shape;
  let halfHeight;
  switch (type) {
    case 'd6':
    case 'color': {
      const half = DIE_SIZES.d6 / 2;
      shape = new CANNON.Box(new CANNON.Vec3(half, half, half));
      halfHeight = half;
      break;
    }
    default: {
      shape = createConvexPolyhedronFromGeometry(mesh.geometry);
      halfHeight = mesh?.userData?.halfHeight;
      break;
    }
  }
  const body = new CANNON.Body({ mass: DIE_MASSES[type] ?? 0.005, shape, material: diceMaterial });
  body.position.copy(mesh.position);
  body.quaternion.copy(mesh.quaternion);
  body.linearDamping = 0.18;
  body.angularDamping = 0.16;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.025;
  body.sleepTimeLimit = 0.4;
  body.userData = { dieType: type };
  if (halfHeight != null) {
    body.userData.halfHeight = halfHeight;
    body.half = halfHeight;
  }
  if (!(type === 'd6' || type === 'color') && mesh.userData.faceGroups) {
    body.userData.faceGroups = mesh.userData.faceGroups.map(g => ({ normal: new CANNON.Vec3(g.normal.x, g.normal.y, g.normal.z), value: g.value }));
  }
  return body;
}

export function applyImpulse(body, index = 0, total = 1) {
  const pos = body.position.clone();
  const lane = total > 1 ? (index - (total - 1) / 2) / Math.max(1, total - 1) : 0;
  const target = new CANNON.Vec3(
    TRAY.halfWidth * randRange(0.2, 0.55),
    pos.y,
    lane * TRAY.halfDepth * 0.9 + randRange(-TRAY.halfDepth * 0.18, TRAY.halfDepth * 0.18)
  );
  const dir = target.vsub(pos);
  dir.y = 0;
  if (dir.lengthSquared() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const speed = randRange(ROLL.launchSpeedMin, ROLL.launchSpeedMax);
  const vy = randRange(ROLL.launchLiftMin, ROLL.launchLiftMax);
  body.velocity.set(dir.x * speed, vy, dir.z * speed);
  const w = randomVec3WithMagnitude(CANNON.Vec3, ROLL.spinMin, ROLL.spinMax);
  body.angularVelocity.copy(w);
}

export function applyGroundFriction(body, dt) {
  const type = body.userData?.dieType;
  const half = (type === 'd6' || type === 'color') ? DIE_SIZES.d6 / 2 : body.shapes?.[0]?.boundingSphereRadius || body.userData?.halfHeight || 0.01;
  const grounded = body.position.y - half < 0.005;
  if (!grounded) return;
  const horiz = new CANNON.Vec3(body.velocity.x, 0, body.velocity.z);
  const speed = horiz.length();
  if (speed > 0) {
    const scale = Math.exp(-FRICTION.linearDrag * dt);
    horiz.scale(scale, horiz);
    body.velocity.x = horiz.x;
    body.velocity.z = horiz.z;
  }
  const ang = body.angularVelocity.length();
  if (ang > 0) {
    const scale = Math.exp(-FRICTION.angularDrag * dt);
    body.angularVelocity.scale(scale, body.angularVelocity);
  }
  if (body.velocity.length() < FRICTION.sleepLinearSpeed && body.angularVelocity.length() < FRICTION.sleepAngularSpeed) {
    body.velocity.setZero();
    body.angularVelocity.setZero();
  }
}

function createConvexPolyhedronFromGeometry(geometry) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position.array;
  const vertices = [];
  const faces = [];
  const vertMap = new Map();
  const precision = 1e-4;
  const getKey = (x, y, z) => `${Math.round(x / precision)}_${Math.round(y / precision)}_${Math.round(z / precision)}`;
  const addVertex = (x, y, z) => {
    const key = getKey(x, y, z);
    if (vertMap.has(key)) return vertMap.get(key);
    const idx = vertices.length;
    vertices.push(new CANNON.Vec3(x, y, z));
    vertMap.set(key, idx);
    return idx;
  };
  for (let i = 0; i < pos.length; i += 9) {
    const v1 = addVertex(pos[i], pos[i+1], pos[i+2]);
    const v2 = addVertex(pos[i+3], pos[i+4], pos[i+5]);
    const v3 = addVertex(pos[i+6], pos[i+7], pos[i+8]);
    faces.push([v1, v2, v3]);
  }
  return new CANNON.ConvexPolyhedron({ vertices, faces });
}
