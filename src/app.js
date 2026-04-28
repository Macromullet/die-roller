import { diceCatalog } from './diceCatalog.js';
import { createDieMesh } from './diceFactory.js';
import { createWorld, createDieBody, applyImpulse, applyGroundFriction } from './physics.js';
import { createRenderer, createScene, createCamera, createLights, createTray, createContactShadow, updateContactShadow } from './scene.js';
import { renderRolling, renderResults, renderError } from './ui.js';
import { TIMESTEP, ROLL } from './constants.js';
import { createRollPlan, updateRollEngine, forceFinishRoll } from './rollEngine.js';

const container = document.getElementById('canvas-container');
const params = new URLSearchParams(window.location.search);
const DEBUG = params.has('debug');
const TEST_MODE = params.has('autotest');

const renderer = createRenderer(container);
const scene = createScene(renderer);
const camera = createCamera(container);
createLights(scene);
createTray(scene);

const { world, diceMaterial } = createWorld();

let debugHud = null;
let debugLastUpdate = 0;
if (DEBUG) {
  debugHud = document.createElement('div');
  debugHud.className = 'debug-hud';
  debugHud.textContent = 'debug';
  container.appendChild(debugHud);
}

let diceMeshes = [];
let diceBodies = [];
let contactShadows = [];
let rolling = false;
let resultsReported = false;
let rollStartTime = 0;
let lastTime;

function animate() {
  const now = performance.now() / 1000;
  const delta = lastTime ? Math.min(now - lastTime, 1 / 10) : TIMESTEP.fixed;
  lastTime = now;

  if (!TEST_MODE) world.step(TIMESTEP.fixed, delta, TIMESTEP.maxSubSteps);

  diceMeshes.forEach((mesh, idx) => {
    const body = diceBodies[idx];
    if (!body) return;
    if (body.userData?.roll?.phase === 'rested') {
      updateContactShadow(contactShadows[idx], body);
      return;
    }
    const ang = body.angularVelocity.length();
    if (ang > TIMESTEP.maxAngularVel) body.angularVelocity.scale(TIMESTEP.maxAngularVel / ang, body.angularVelocity);
    const lin = body.velocity.length();
    if (lin > TIMESTEP.maxLinearVel) body.velocity.scale(TIMESTEP.maxLinearVel / lin, body.velocity);
    applyGroundFriction(body, delta);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
    updateContactShadow(contactShadows[idx], body);
  });

  const rollDuration = now - rollStartTime;
  const allRested = rolling
    ? updateRollEngine(world, diceBodies, diceMeshes, rollDuration, delta)
    : false;

  if (DEBUG && debugHud && now - debugLastUpdate > 0.2) {
    debugLastUpdate = now;
    const lin = diceBodies.map(b => b.velocity.length());
    const ang = diceBodies.map(b => b.angularVelocity.length());
    const avgLin = lin.length ? lin.reduce((a, b) => a + b, 0) / lin.length : 0;
    const avgAng = ang.length ? ang.reduce((a, b) => a + b, 0) / ang.length : 0;
    const rested = diceBodies.filter(b => b.userData?.roll?.phase === 'rested').length;
    debugHud.textContent = `t=${rollDuration.toFixed(2)}s\nv=${avgLin.toFixed(2)} m/s ω=${avgAng.toFixed(2)} rad/s\nlanded ${rested}/${diceBodies.length}`;
  }

  if (!TEST_MODE && rolling && !resultsReported && diceBodies.length > 0) {
    if (rollDuration > ROLL.maxDuration && !allRested) {
      forceFinishRoll(world, diceBodies, diceMeshes, rollDuration);
    }
    if (allRested || rollDuration > ROLL.maxDuration) {
      resultsReported = true;
      rolling = false;
      const type = diceBodies[0].userData?.dieType;
      const definition = diceCatalog[type];
      const results = diceBodies.map(body => body.userData.roll.result);
      renderResults(definition, results);
      const rollButton = document.getElementById('roll');
      rollButton.disabled = false;
      rollButton.textContent = 'Roll the dice';
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function rollDice() {
  try {
    const type = document.getElementById('die').value;
    const count = Math.max(1, Math.min(parseInt(document.getElementById('count').value, 10) || 1, 12));
    document.getElementById('count').value = count;
    const definition = diceCatalog[type];
    if (!definition) return;
    diceMeshes.forEach(mesh => scene.remove(mesh));
    contactShadows.forEach(shadow => scene.remove(shadow));
    diceBodies.forEach(body => {
      if (body.world === world) world.removeBody(body);
    });
    diceMeshes = [];
    diceBodies = [];
    contactShadows = [];
    rolling = true;
    resultsReported = false;
    rollStartTime = performance.now() / 1000;
    renderRolling();
    const rollButton = document.getElementById('roll');
    rollButton.disabled = true;
    rollButton.textContent = 'Rolling...';
    for (let i = 0; i < count; i++) {
      const mesh = createDieMesh(definition, i, count, type, renderer);
      const shadow = createContactShadow();
      scene.add(shadow);
      scene.add(mesh);
      const body = createDieBody(definition, mesh, type, diceMaterial);
      createRollPlan(body, mesh);
      applyImpulse(body, i, count);
      world.addBody(body);
      diceMeshes.push(mesh);
      diceBodies.push(body);
      contactShadows.push(shadow);
    }
  } catch (error) {
    console.error('Dice roll failed:', error);
    renderError('Rolling failed — refresh the page.');
  }
}

document.getElementById('roll').addEventListener('click', rollDice);
window.addEventListener('resize', () => {
  const { clientWidth, clientHeight } = container;
  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
});

animate();
