# Temple Dash

An endless runner game inspired by Temple Run, built entirely with vanilla HTML5 Canvas and JavaScript — no dependencies, no build step.

## How to Play

Open `index.html` in any modern browser.

| Control | Action |
|---|---|
| ← → or A / D | Switch lanes |
| ↑ or W or Space | Jump |
| Swipe (touch) | Mobile controls |

Dodge through gaps in ancient stone walls. Collect coins for bonus points. Speed increases over time.

## Project Structure

```
temple-dash/
├── index.html              ← Entry point (loads all modules)
├── style.css               ← All styling (game chrome, overlay, HUD)
├── README.md
└── src/
    ├── config.js           ← Perspective, physics, tuning constants
    ├── input.js            ← Keyboard & touch input handling
    ├── player.js           ← Player state, jump physics, rendering
    ├── obstacles.js        ← Wall spawning, gap logic, collision, rendering
    ├── coins.js            ← Coin spawning, collection, rendering
    ├── environment.js      ← Sky, ground, runway, side walls, trees
    ├── particles.js        ← Particle system (death fx, coin collect)
    ├── ui.js               ← Overlay, HUD, score display
    └── game.js             ← Main loop, init, update, draw orchestration
```

## Architecture

All modules attach to a shared `window.TD` namespace. `config.js` is loaded first and defines all constants. Each module is self-contained and responsible for its own update + draw cycle. `game.js` orchestrates everything.

No bundler needed — just script tags with the right load order.

## Customization

Tuning knobs are in `src/config.js`:
- `baseSpeed` / `maxSpeed` — game pace
- `JUMP_VEL` / `GRAV` — jump height and airtime
- `OBS_INTERVAL` — time between obstacles
- `VP_Y` — camera height (lower = more dramatic)
- `LANE_W` — lane width

## License

Free to use, modify, and share.
