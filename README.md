# DUST

A low-poly **post-apocalyptic wasteland survival** game for the browser —
Mad-Max-flavoured. The water's gone and the raiders are coming. Scavenge a dying
outpost, keep your war-car fuelled, and follow the convoy south toward a rumour
of green.

> 📄 Full concept, world, mechanics, and roadmap: **[DESIGN.md](DESIGN.md)**

This repo currently contains the **M0 vertical slice** — *the Holdout* — proving
the core loop (driving + fuel + salvage) before the rest of the wasteland is built.

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

Then open the printed URL (e.g. `http://localhost:8000`) and click **ROLL OUT**.

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Move on foot / drive the car |
| **Mouse** | Look |
| **F** | Enter / exit the car (stand near it) |
| **Space** / **Shift** | Hop (on foot) · handbrake-drift (driving) |
| **E** | Salvage / play log / crank pump / grab fuel |
| **J** or **Tab** | Toggle journal |
| **M** | Toggle missions panel |
| **Esc** | Release the mouse |

A **minimap** (top-right, north-up) shows points of interest — salvage (yellow),
radio logs (cyan), the pump, fuel cans (orange), raiders (red), the reservoir,
and the green rig goal — plus your heading. Floating diamond **beacons** mark each
objective in the world and vanish once you've handled it.

## The slice's loop

1. **Drive** the war-car out of the Holdout across the dunes — mind the fuel gauge.
2. **Grab fuel cans** scattered in the wastes to keep rolling (the gauge turns red when low).
3. Watch for **raiders** — enemy buggies hunt you while driving. **Ram them at speed** to wreck them (they explode and drop fuel); take too many hits and your hull gives out. Mind the HULL gauge and the threat indicator.
4. Get out and **salvage** 6 clues — they tell the story of the raid and the convoy.
5. **Play** the two radio logs at the terminals.
6. **Crank the water pump** in the garage → the Holdout's lights come on and the gate grinds open. Then **stand by the reservoir** to drink and refill your WATER meter (it drains over time — empty, and dehydration eats your hull).
7. Do all of the above → the slice's ending plays. The green rig waits on the
   south horizon for the full game.

## What's here

```
index.html    # shell + import map + UI (HUD, fuel gauge, journal, overlays)
styles.css    # wasteland HUD / fuel gauge / overlays
src/main.js   # the game: terrain, drivable car, fuel, salvage, audio, journal, win
DESIGN.md     # the design document
```

Everything is procedural primitives + synthesized audio, so the whole thing is a
few KB and downloads nothing but Three.js.
