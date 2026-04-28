export const TRAY = { halfWidth: 0.08, halfDepth: 0.06, wallHeight: 0.03, wallThickness: 0.006 };

export const DIE_SIZES = {
  d6: 0.023,
  color: 0.023,
  d8: 0.024,
  d10: { radius: 0.015, height: 0.03 },
  d12: 0.025,
  d20: 0.025,
};

export const DIE_MASSES = {
  d6: 0.006,    // 6g - quality casino dice
  color: 0.006,
  d8: 0.008,    // 8g
  d10: 0.006,   // 6g
  d12: 0.010,   // 10g
  d20: 0.013,   // 13g - d20s are chunky!
};

export const WORLD = {
  gravity: { x: 0, y: -9.82, z: 0 },
  solverIterations: 14,
  solverTolerance: 1e-5,
  defaultFriction: 0.55,
  defaultRestitution: 0.16,
  diceTableFriction: 0.62,
  diceTableRestitution: 0.18,
  diceDiceFriction: 0.45,
  diceDiceRestitution: 0.16,
};

export const TIMESTEP = {
  fixed: 1 / 240,
  maxSubSteps: 5,
  maxAngularVel: 38,
  maxLinearVel: 4,
};

export const ROLL = {
  minDuration: 0.8,
  maxDuration: 4,
  stableLinearSpeed: 0.045,
  stableAngularSpeed: 0.22,
  stableFaceDot: 0.94,
  stableTime: 0.28,
  launchSpeedMin: 1.05,
  launchSpeedMax: 1.55,
  launchLiftMin: 0.5,
  launchLiftMax: 0.85,
  spinMin: 12,
  spinMax: 24,
};

export const FRICTION = {
  linearDrag: 2.2,
  angularDrag: 1.65,
  sleepLinearSpeed: 0.018,
  sleepAngularSpeed: 0.08,
};

export const COLOR_FACES = [
  { name: 'Orange', color: '#ff7a00' },
  { name: 'Blue',   color: '#0057ff' },
  { name: 'Pink',   color: '#ff2aa3' },
  { name: 'Green',  color: '#00b341' },
  { name: 'Yellow', color: '#f5c400' },
  { name: 'Red',    color: '#cc0000' },
];
