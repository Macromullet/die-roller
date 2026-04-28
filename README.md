# 3D Dice Roller

A browser-based tabletop dice roller with real-time 3D animation, Cannon.js physics, Three.js rendering, common polyhedral dice, and a special six-sided color die.

The app is intentionally client-side and static-hostable. There is no build step required for normal use.

## What this app is doing

The current implementation prioritizes an honest visual roll:

- Dice are launched into a physics tray with Cannon.js.
- The app waits for each die to slow down and settle.
- Results are read from the die's final physical orientation.
- The displayed result is not preselected and the die is not moved after the roll to match a generated result.

That means the animation and result stay consistent: what the user sees resting face-up is what the app reports.

## Supported dice

| Die | Rendering | Result detection |
| --- | --- | --- |
| d6 | Rounded cube with black pips | Top cube face normal |
| Color die | Rounded cube with solid flat color faces | Top cube face normal mapped to color |
| d8 | Octahedron with face labels | Top face normal |
| d10 | Custom pentagonal bipyramid-style geometry | Top face normal |
| d12 | Dodecahedron with face labels | Top face normal |
| d20 | Icosahedron with face labels | Top face normal |

The color die uses intentionally flat primary-style face colors so the color identity is readable under lighting.

## Running locally

Install dependencies once:

```bash
npm install
```

Then serve the project root with any static file server:

```bash
# Python
python -m http.server 8000

# Node 18+
node -e "require('http').createServer((req, res) => require('fs').createReadStream(req.url === '/' ? 'index.html' : '.' + req.url).pipe(res)).listen(8000)"
```

Open `http://localhost:8000`.

The page uses browser import maps and loads Three.js/Cannon.js modules in the browser. Network access may be required the first time the CDN modules are loaded.

## Usage

1. Choose a die type.
2. Choose a dice count from 1 to 12.
3. Click **Roll the dice**.
4. Wait for the dice to settle; results appear after final resting faces are detected.

## Roll and physics model

The physics model is split into a few focused modules:

- `src/physics.js` creates the Cannon.js world, tray collision planes, die bodies, launch velocity, spin, damping, and ground friction.
- `src/rollEngine.js` tracks active rolls, detects stable final poses, freezes the final pose, and reads the top result.
- `src/faces.js` stores cube face mappings for d6 and color dice.
- `src/diceFactory.js` creates Three.js meshes, materials, face textures, labels, and edge highlights.

Roll completion is based on:

- minimum roll duration,
- low linear and angular velocity,
- a top face normal with enough alignment to world-up,
- and a short stable-time window.

If a die fails to settle before the timeout, the app freezes the current physical pose and reports that pose rather than manufacturing a separate result.

## Rendering model

The scene uses a real-time raster rendering approach rather than path tracing:

- Three.js `MeshPhysicalMaterial` for dice and tray materials.
- ACES tone mapping with controlled exposure.
- A generated neutral studio environment map.
- Rect-area lights for broad soft illumination.
- A restrained shadow-casting spot light.
- Contact-shadow decals under dice for stronger grounding.
- Rounded cube geometry for the d6 and color die.

This is meant to give a more physical tabletop feel without the performance/noise cost of browser path tracing.

## Testing

Run:

```bash
npm test
```

The test script performs syntax checks for the browser modules and runs `test/physicsSmoke.test.js`.

The smoke test creates each die type, runs a headless physics roll, waits for the roll engine to finish or force-finish at timeout, and verifies:

- the die reaches a finished state,
- a result is reported,
- the result is within the valid side range,
- and the mesh remains aligned with the physics body.

## Important tradeoffs

- The app does not claim casino-grade physical fairness. Browser physics is used for an interactive tabletop feel, not certified randomness.
- The result is derived from the simulated final pose, so physics tuning affects distribution.
- The color die is intentionally stylized with flat color swatches for readability.
- Polyhedral dice labels are visual decals; their result mapping follows generated face groups.

## Project structure

```text
index.html                 App shell, layout, import map
src/app.js                 Main loop and roll orchestration
src/constants.js           Tray, dice, physics, roll, and color constants
src/diceCatalog.js         Die definitions and geometry factories
src/diceFactory.js         Meshes, face textures, labels, materials
src/faces.js               Cube face value/color mappings
src/physics.js             Cannon.js world and body setup
src/rollEngine.js          Stability detection and final result reading
src/scene.js               Renderer, camera, lights, tray, contact shadows
src/ui.js                  Results and error rendering
test/physicsSmoke.test.js  Headless roll smoke coverage
```
