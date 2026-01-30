import * as CANNON from 'cannon-es';
import { TRAY, DIE_SIZES, DIE_MASSES, WORLD, FRICTION } from './constants.js';
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
    case 'd10':
      shape = new CANNON.Cylinder(DIE_SIZES.d10.radius, DIE_SIZES.d10.radius, DIE_SIZES.d10.height, 10);
      halfHeight = DIE_SIZES.d10.height / 2;
      break;
    default: {
      const geom = definition.geometry();
      shape = createConvexPolyhedronFromGeometry(geom);
      halfHeight = mesh?.userData?.halfHeight;
      break;
    }
  }
  const body = new CANNON.Body({ mass: DIE_MASSES[type] ?? 0.005, shape, material: diceMaterial });
  body.position.copy(mesh.position);
  body.quaternion.copy(mesh.quaternion);
  body.linearDamping = 0.85;
  body.angularDamping = 0.9;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.06;
  body.sleepTimeLimit = 0.1;
  body.userData = { dieType: type };
  if (halfHeight != null) {
    body.userData.halfHeight = halfHeight;
    body.half = halfHeight;
  }
  if (!(type === 'd6' || type === 'color') && mesh.userData.faceGroups) {
    body.userData.faceGroups = mesh.userData.faceGroups.map(g => ({ normal: new CANNON.Vec3(g.normal.x, g.normal.y, g.normal.z), value: g.value }));
  }
  if (type === 'd10') {
    body.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  }
  return body;
}

export function applyImpulse(body) {
  const pos = body.position.clone();
  const target = new CANNON.Vec3(0, pos.y, randRange(-TRAY.halfDepth * 0.3, TRAY.halfDepth * 0.3));
  const dir = target.vsub(pos);
  dir.y = 0;
  if (dir.lengthSquared() < 1e-6) dir.set(1, 0, 0);
  dir.normalize();
  const speed = randRange(0.6, 1.1);
  const vy = randRange(0.4, 0.8);
  body.velocity.set(dir.x * speed, vy, dir.z * speed);
  const w = randomVec3WithMagnitude(CANNON.Vec3, 3, 8 * 1.3);
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
    const drop = FRICTION.groundDecel * dt;
    const newSpeed = Math.max(0, speed - drop);
    if (speed > 0) horiz.scale(newSpeed / speed, horiz);
    body.velocity.x = horiz.x;
    body.velocity.z = horiz.z;
    // Static clamp: kill tiny residual sliding
    if (newSpeed < (FRICTION.staticClampLin ?? 0)) {
      body.velocity.x = 0;
      body.velocity.z = 0;
    }
  }
  const ang = body.angularVelocity.length();
  if (ang > 0) {
    const angDrop = FRICTION.angDrop * dt;
    const scale = Math.max(0, 1 - angDrop);
    body.angularVelocity.scale(scale, body.angularVelocity);
    if (ang * scale < (FRICTION.staticClampAng ?? 0)) {
      body.angularVelocity.setZero();
    }
  }
}

function createConvexPolyhedronFromGeometry(geometry) {
  const geo = geometry.toNonIndexed();
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
