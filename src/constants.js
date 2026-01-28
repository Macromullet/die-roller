export const TRAY = { halfWidth: 0.08, halfDepth: 0.06, wallHeight: 0.03, wallThickness: 0.006 };

export const DIE_SIZES = {
  d6: 0.019,
  color: 0.019,
  d8: 0.02,
  d10: { radius: 0.011, height: 0.028 },
  d12: 0.021,
  d20: 0.021,
};

export const DIE_MASSES = {
  d6: 0.005,
  color: 0.005,
  d8: 0.0055,
  d10: 0.005,
  d12: 0.006,
  d20: 0.006,
};

export const WORLD = {
  gravity: { x: 0, y: -9.82, z: 0 },
  solverIterations: 20,
  solverTolerance: 1e-4,
  defaultFriction: 0.78,
  defaultRestitution: 0.08,
  diceTableFriction: 0.78,
  diceTableRestitution: 0.08,
  diceDiceFriction: 0.7,
  diceDiceRestitution: 0.08,
};

export const TIMESTEP = {
  fixed: 1 / 240,
  maxSubSteps: 5,
  maxAngularVel: 20,
  maxLinearVel: 3,
};

export const FREEZE = {
  dotStable: 0.99,
  linStable: 0.05,
  angStable: 0.2,
  minTime: 1.0,
  stableTime: 0.2,
  velStableTime: 0.5,
  fallbackTime: 3.0,
  fallbackDot: 0.9,
  fallbackLin: 0.2,
  fallbackAng: 1.0,
};

export const FRICTION = {
  groundDecel: 5, // m/s^2 tangential decel
  angDrop: 8,    // angular velocity drop factor per second
};

export const COLOR_FACES = [
  { name: 'Orange', color: '#fb923c' },
  { name: 'Blue',   color: '#3b82f6' },
  { name: 'Pink',   color: '#ec4899' },
  { name: 'Green',  color: '#22c55e' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Red',    color: '#ef4444' },
];
