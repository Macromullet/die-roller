# 3D Dice Roller

A browser-based dice rolling experience with crypto-grade randomness, animated 3D dice, and support for common tabletop dice plus a special color-faced option.

## Running locally

You only need a static file server. From the project root, start one of the following and open the printed URL in your browser:

```bash
# Using Python (included in most environments)
python -m http.server 8000

# Using Node's built-in server (Node 18+)
node -e "require('http').createServer((req, res) => require('fs').createReadStream('index.html').pipe(res)).listen(8000)" &
```

Then visit `http://localhost:8000` to interact with the app. The page fetches Three.js from a CDN, so network access is required the first time you load it.

## Usage

1. Pick a die type (standard D&D dice, poker d6, or the color die).
2. Set how many dice to roll (up to 12 at once).
3. Click **Roll the dice** to see the 3D animation and the roll results, including color chips for the special die.

## Notes

- Random rolls use `crypto.getRandomValues` when available.
- The app is entirely client-side; no build step is needed.
