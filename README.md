# HOLLOW

A low-poly **planet exploration mystery** for the browser. You land on a quiet,
abandoned planet and piece together what emptied it — by walking, scanning, and
bringing the lights back on. No combat; exploration and atmosphere carry it.

> 📄 Full concept, world structure, mechanics, and roadmap: **[DESIGN.md](DESIGN.md)**

This repo currently contains the **M0 vertical slice** — the *settlement* zone —
proving the core loop before the rest of the planet is built.

## Run it

It's a static site with no build step (Three.js loads from a CDN via an import
map). You just need a local web server, because ES modules don't load over
`file://`.

```bash
# any one of these, from the repo root:
npx serve .
# or
python3 -m http.server 8000
```

Then open the printed URL (e.g. `http://localhost:8000`) and click **LAND**.

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Mouse** | Look |
| **Space** | Jetpack hop (low gravity) |
| **E** | Scan / play log / restore power (look at glowing objects) |
| **J** or **Tab** | Toggle journal |
| **Esc** | Release the mouse |

## The slice's loop

1. Explore the settlement (4 dwellings, a hub, your landing pod, the relay antenna).
2. **Scan** 3 environmental clues — they tell the story of the evacuation.
3. **Play** the operations data log at the terminal.
4. **Restore power** at the main breaker → the windows light up and the hub door opens.
5. Do all of the above → the slice's ending plays. Listen for the mine hum
   growing as you wander toward the orange horizon.

## What's here

```
index.html    # shell + import map + UI overlays
styles.css    # HUD, journal, overlays
src/main.js   # the game: world, movement, scanner, audio, journal, win state
DESIGN.md     # the design document
```

Everything is procedural primitives + synthesized audio, so the whole thing is a
few KB and downloads nothing but Three.js.
