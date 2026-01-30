import * as THREE from 'three';
import * as CANNON from 'cannon-es';
console.log('app.js loaded');
import { secureRandomInt } from './random.js';
import { diceCatalog } from './diceCatalog.js';
import { createDieMesh } from './diceFactory.js';
import { createWorld, createDieBody, applyImpulse, applyGroundFriction } from './physics.js';
import { detectResult, detectTop, freezeBody } from './freeze.js';
import { createRenderer, createScene, createCamera, createLights, createTray } from './scene.js';
import { renderRolling, renderResults, renderError } from './ui.js';
import { TIMESTEP, FREEZE } from './constants.js';

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
    if (body.userData?.frozen) {
      const pose = body.userData.frozenPose;
      if (pose) { mesh.position.copy(pose.position); mesh.quaternion.copy(pose.quaternion); }
      return;
    }
    const ang = body.angularVelocity.length();
    if (ang > TIMESTEP.maxAngularVel) body.angularVelocity.scale(TIMESTEP.maxAngularVel / ang, body.angularVelocity);
    const lin = body.velocity.length();
    if (lin > TIMESTEP.maxLinearVel) body.velocity.scale(TIMESTEP.maxLinearVel / lin, body.velocity);
    applyGroundFriction(body, delta);
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  });

  const rollDuration = now - rollStartTime;
  if (DEBUG && debugHud && now - debugLastUpdate > 0.2) {
    debugLastUpdate = now;
    const lin = diceBodies.map(b => b.velocity.length());
    const ang = diceBodies.map(b => b.angularVelocity.length());
    const avgLin = lin.length ? lin.reduce((a, b) => a + b, 0) / lin.length : 0;
    const avgAng = ang.length ? ang.reduce((a, b) => a + b, 0) / ang.length : 0;
    const sleeping = diceBodies.filter(b => b.userData?.frozen || b.sleepState === CANNON.Body.SLEEPING).length;
    debugHud.textContent = `t=${rollDuration.toFixed(2)}s\nv=${avgLin.toFixed(2)} m/s ω=${avgAng.toFixed(2)} rad/s\nsleeping ${sleeping}/${diceBodies.length}`;
  }

  if (!TEST_MODE && rolling && !resultsReported && diceBodies.length > 0) {
    diceBodies.forEach((body, i) => {
      if (body.userData?.frozen) return;
      const lin = body.velocity.length();
      const ang = body.angularVelocity.length();
      const type = body.userData?.dieType;
      const definition = diceCatalog[type];
      if (rollDuration > FREEZE.minTime) {
           const topRes = detectTop(body, definition, type);
           const isStable = topRes && topRes.dot > FREEZE.dotStable && lin < FREEZE.linStable && ang < FREEZE.angStable;
        body.userData.stableTime = isStable ? (body.userData.stableTime || 0) + delta : 0;
        if (isStable && body.userData.stableTime >= FREEZE.stableTime) {
          freezeBody(world, body, diceMeshes[i], definition, type);
        }
        const velStable = lin < FREEZE.linStable && ang < FREEZE.angStable;
        body.userData.velStableTime = velStable ? (body.userData.velStableTime || 0) + delta : 0;
        if (!body.userData.frozen && rollDuration > 2 && body.userData.velStableTime >= FREEZE.velStableTime) {
          freezeBody(world, body, diceMeshes[i], definition, type);
        }
        if (!body.userData.frozen && rollDuration > FREEZE.fallbackTime) {
          const top2 = detectTop(body, definition, type);
          if (top2 && top2.dot > FREEZE.fallbackDot && lin < FREEZE.fallbackLin && ang < FREEZE.fallbackAng) {
            freezeBody(world, body, diceMeshes[i], definition, type);
          }
        }
      }
    });
    const allSleeping = diceBodies.every(body => body.userData?.frozen || body.sleepState === CANNON.Body.SLEEPING);
    if (allSleeping || rollDuration > 4.5) {
      resultsReported = true;
      rolling = false;
      const type = diceBodies[0].userData?.dieType;
      const definition = diceCatalog[type];
      const results = diceBodies.map(body => {
        if (body.userData?.frozenResult) return body.userData.frozenResult;
        const detected = detectResult(body, definition, type);
        if (detected) return detected;
        return { value: secureRandomInt(definition.sides) + 1 };
      });
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
    diceBodies.forEach(body => { try { world.removeBody(body); } catch (e) {} });
    diceMeshes = [];
    diceBodies = [];
    rolling = true;
    resultsReported = false;
    rollStartTime = performance.now() / 1000;
    renderRolling();
    const rollButton = document.getElementById('roll');
    rollButton.disabled = true;
    rollButton.textContent = 'Rolling...';
    for (let i = 0; i < count; i++) {
      const mesh = createDieMesh(definition, i, count, type, renderer);
      scene.add(mesh);
      const body = createDieBody(definition, mesh, type, diceMaterial);
      applyImpulse(body);
      world.addBody(body);
      diceMeshes.push(mesh);
      diceBodies.push(body);
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
