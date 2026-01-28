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
  defaultFriction: 0.9,
  defaultRestitution: 0.05,
  diceTableFriction: 0.92,
  diceTableRestitution: 0.03,
  diceDiceFriction: 0.75,
  diceDiceRestitution: 0.03,
};

export const TIMESTEP = {
  fixed: 1 / 240,
  maxSubSteps: 5,
  maxAngularVel: 20,
  maxLinearVel: 3,
};

export const FREEZE = {
  dotStable: 0.99,
  linStable: 0.04,
  angStable: 0.15,
  minTime: 0.4,
  stableTime: 0.25,
  velStableTime: 0.4,
  fallbackTime: 2.5,
  fallbackDot: 0.92,
  fallbackLin: 0.25,
  fallbackAng: 0.8,
};

export const FRICTION = {
  groundDecel: 7.5, // m/s^2 tangential decel
  angDrop: 10,    // angular velocity drop factor per second
  staticClampLin: 0.02, // m/s, clamp to zero when below this
  staticClampAng: 0.2,  // rad/s, clamp to zero when below this
};

export const COLOR_FACES = [
  { name: 'Orange', color: '#fb923c' },
  { name: 'Blue',   color: '#3b82f6' },
  { name: 'Pink',   color: '#ec4899' },
  { name: 'Green',  color: '#22c55e' },
  { name: 'Yellow', color: '#eab308' },
  { name: 'Red',    color: '#ef4444' },
];
