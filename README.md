# Tennis Shot Lab

A self-contained tennis strategy game. Choose Normal, Power, or Slice, then tap the opponent’s half of the court. Your player moves automatically and the game pauses at each playable return so you can think about placement.

## Run

Requires Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
cd /workspace/tennis-shot-lab
npm ci
npm run dev
```

The development server uses port 5173 by default. The application needs no credentials, backend, or external APIs. After installation, gameplay makes no external requests.

```sh
npm test          # deterministic simulation tests
npm run build    # production files in dist/
npm run preview  # serve the production build locally
```

## Play

- **Quick Match:** first to 7 points with a two-point lead. Serves follow the standard 1–2–2 tiebreak order. The screen keeps you at the bottom of the court.
- **Practice Court:** unlimited rallies without a score.
- **Challenges:** five real gameplay goals, with progress during the current attempt and locally remembered completion badges. Select a challenge or use Retry to start its progress again.
- **Rookie, Club Player, Pro:** change opponent movement, reaction time, accuracy, and targeting. Switching difficulty starts a fresh session. The last challenge always uses Rookie.
- **Controls:** mouse or touch to target; number keys 1/2/3 to choose a shot. Focus the court, use arrow keys to move the target, and press Enter or Space to hit. Help replays the interactive tutorial. The main menu pauses the game.
- Deep shots push the opponent back. Wide shots open the other side. Power travels faster, with a greater chance of going out. Slice travels slower with a lower arc. Shots too close to the lines add risk. Slower shots give both players more time to recover.

The simulation has a seeded random generator and is independent of React. Outcomes depend on position, available travel time, reach, difficulty, and shot risk. It uses intentionally simplified tennis rules and physics: automatic in-bounds serves, no change of ends, and no manual movement.

## Files

- `src/engine.js`: simulation, scoring, seeded opponent, and challenge detection.
- `src/engine.test.js`: meaningful gameplay tests, including complete matches and all five challenges.
- `src/App.jsx`: responsive SVG court, controls, coaching, tutorial, and menu.
- `src/styles.css`: visual design and reduced-motion support.
- `tests/browser_smoke.py`: browser checks using Python Playwright and system Chromium. With the app running, run `python3 tests/browser_smoke.py`. These tools are available in the prepared cloud environment; they are not application dependencies.

Preferences, tutorial completion, and challenge badges are stored only in this browser. Storage failure does not prevent play. Clearing site data resets these preferences.

This repository contains only Tennis Shot Lab. It is independent of Fantasy GM and has no dependency on n8n or its data.
