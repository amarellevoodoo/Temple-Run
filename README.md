# Temple Dash

An endless runner game inspired by Temple Run, built entirely with vanilla HTML5 Canvas and JavaScript — no dependencies, no build step.

## How to Play

Open `index.html` in any modern browser (or serve the folder with `python3 -m http.server 8000`).

| Control | Action |
|---|---|
| ← → or A / D | Switch lanes |
| ↑ or W or Space | Jump |
| Swipe (touch) | Mobile controls |

Dodge through gaps in ancient stone walls. Collect coins for bonus points. Speed increases over time, and the world itself changes as you run farther.

## Biomes

The map transitions automatically based on distance traveled in a single run. Each biome has its own sky, ground, wall, tree, and obstacle palette:

| Distance | Biome |
|---|---|
| 0 m   | Jungle Temple |
| 300 m | Desert Ruins |
| 700 m | Frozen Sanctum |
| 1200 m | Lava Citadel |

A "Entering: X" banner flashes briefly on each transition. Biome thresholds and palettes are defined in `src/biomes.js` — easy to retune or extend.

## Global Leaderboard (optional)

Compete asynchronously with the world's highest scores. Setup takes ~1 minute:

1. Visit <https://www.dreamlo.com/>, enter an email, and copy the two keys it gives you.
2. Open `src/leaderboard.js` and paste them into the `DREAMLO` block at the top.
3. Reload the page.

You'll be prompted for a display name on first run (cached in `localStorage`). On death your score is auto-submitted, and the start / game-over screens show the top 10 with your row highlighted.

If you don't configure Dreamlo the game still runs fine — the leaderboard panel just shows an "offline" message.

> Note: this leaderboard is unmoderated. The Dreamlo write key sits in the client by design, so determined users can submit fake scores. Acceptable for a casual hobby game; swap for a real backend if you need anti-cheat.

## Project Structure

```
temple-dash/
├── index.html              ← Entry point (loads all modules)
├── style.css               ← All styling (game chrome, overlay, HUD, leaderboard)
├── README.md
└── src/
    ├── config.js           ← Perspective, physics, tuning constants
    ├── biomes.js           ← Biome palettes + distance-based active biome
    ├── input.js            ← Keyboard & touch input handling
    ├── player.js           ← Player state, jump physics, rendering
    ├── obstacles.js        ← Wall spawning, gap logic, collision, rendering
    ├── coins.js            ← Coin spawning, collection, rendering
    ├── environment.js      ← Sky, ground, runway, side walls, trees (uses biome palette)
    ├── particles.js        ← Particle system (death fx, coin collect)
    ├── leaderboard.js      ← Dreamlo submit/fetch + player name handling
    ├── ui.js               ← Overlay, HUD, biome banner, leaderboard rendering
    └── game.js             ← Main loop, init, update, draw orchestration
```

## Architecture

All modules attach to a shared `window.TD` namespace. `config.js` is loaded first, then `biomes.js` (so palettes are available to drawers), then the rest. `game.js` orchestrates the main loop.

No bundler needed — just script tags with the right load order (see `index.html`).

## Customization

Tuning knobs:

- `src/config.js`
  - `baseSpeed` / `maxSpeed` — game pace
  - `JUMP_VEL` / `GRAV` — jump height and airtime
  - `OBS_INTERVAL` — time between obstacles
  - `VP_Y` — camera height (lower = more dramatic)
  - `LANE_W` — lane width
- `src/biomes.js`
  - Reorder, add, or recolor biomes. Change the `unlockAt` meters to shift the difficulty curve.
- `src/leaderboard.js`
  - `DREAMLO.PRIVATE_KEY`, `DREAMLO.PUBLIC_CODE` — leaderboard credentials.
  - `NAME_MAX`, `DEFAULT_NAME` — player name constraints.

## License

Free to use, modify, and share.
