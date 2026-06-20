# HOLLOW — Design Document

> A low-poly planet exploration mystery for the browser.
> You land on a quiet, abandoned planet and piece together what emptied it.

---

## 1. Vision & Pillars

**One-line pitch:** Alone on a small, hand-crafted planet that was clearly inhabited — and isn't anymore — you explore, scan, and restore power to reconstruct what happened the night everyone left.

**Design pillars** (every decision is judged against these):

1. **Lonely, not empty.** Silence and scale create tension, not boredom. The world *implies* people through the things they left behind.
2. **Exploration is the game.** No combat. Moving through the world must feel good on its own. Traversal, atmosphere, and curiosity carry the experience.
3. **The player reconstructs the story.** Clues are found out of order. The game never explains; the player assembles the truth in their head (and in a journal).
4. **Low-poly as intent.** Clean, deliberate geometry makes abandonment feel designed, not cheap — and keeps the game tiny and fast in a browser.

---

## 2. The Mystery

Design the ending first; scatter breadcrumbs backward.

**Canonical story (the "truth"):**
The Hollow colony was a mining settlement. They dug toward the planet's core and discovered it was **artificial — a shell with something inside it that hums**. The discovery destabilized them: some fled on the evacuation transports (the vehicles all point *away* from the settlement), some stayed and stopped recording. The hum is growing. You are not the first explorer to land — the oldest logs are in *your* voice.

**How it's told:** Audio/data logs that grow more frantic by date. Environmental tableaux (a meal no one ate, a child's drawing of the thing in the mine). A scanner that names anomalies. The relay tower at the end broadcasts the final log.

**Payoff:** Restoring the relay reveals the full map *and* plays the last broadcast — the moment of discovery — recontextualizing everything the player already found.

---

## 3. World Structure (the "open world")

A planet gives natural, memorable zones connected by open traversal. For the first build the planet reads as a planet via **curved horizon + skybox + fog**, not true spherical gravity (that's a v2 rabbit hole).

| Zone | Role | Palette | Mystery beat |
|------|------|---------|--------------|
| 🛰️ **Landing site** | Tutorial / home base (your pod) | Neutral grey-blue | "You are alone. Lights are on." |
| 🏚️ **The settlement** | Main story hub (**the demo zone**) | Cold blue + warm emissive windows | Evacuation aftermath; first logs |
| ⛏️ **The mine / dig site** | What they were digging for | Rusty orange | The discovery; the hum gets louder |
| 🌫️ **The hollow** | The literal hollow — title drop | Sickly green | The shell; the thing inside |
| 📡 **The relay tower** | Endgame; reveals map + final log | Cold white emissive | The truth; you are not the first |

**Gating:** Power restoration and found key-codes reveal the world in layers. The scanner pings toward the next point of interest so the player is never lost but never hand-held.

---

## 4. Core Mechanics

1. **Walk + low-G hop / jetpack.** Short jetpack hops make a planet feel like a planet and trivialize terrain. *This is the #1 thing to nail.*
2. **Scanner (primary verb).** Point at an object → reveal its lore tag/name/anomaly. Doubles as navigation (pings toward unscanned points of interest).
3. **Audio / data logs.** Found at terminals; the colonists' voices carry the narrative.
4. **Power restoration.** Find cells / flip switches to bring zones back online → unlocks doors → sense of progress + natural gating.
5. **Journal.** Auto-collects discovered facts so the player can assemble the timeline.
6. **(Optional) Oxygen / resources.** Light survival pressure for stakes without combat. Off by default in the demo.

---

## 5. Art & Audio Direction

**Visual**
- Flat shading + vertex colors instead of textures → tiny files, instant low-poly look.
- Bold limited palette **per zone** so areas are recognizable from afar.
- Big silhouettes (domes, antennae, monoliths) — navigate by landmark, not map.
- One emissive accent color per zone (glowing windows/terminals) to draw the eye.
- Atmosphere is free polish: fog, low sun, dust particles, a single moody skybox.

**Audio**
- Positional Web Audio. The signature trick: **a hum from the mine that grows louder as you approach** — that's the whole mood in one effect.
- Footsteps, jetpack whoosh, UI blips. Long silences punctuated by a single distant sound.

---

## 6. Web Tech Stack

- **Three.js** (no-build, ES modules via CDN importmap) — see the demo.
- **glTF + Draco** for real assets later; demo uses procedural primitive geometry (zero asset downloads).
- **InstancedMesh** for rocks/props (render thousands cheaply).
- **Fog + limited draw distance** for performance *and* mood.
- **Web Audio API** for positional sound.
- **localStorage / IndexedDB** for saves.
- Watch out for: mobile perf, asset size budget, pointer-lock UX (needs a "click to start" gate).

---

## 7. Build Order (milestones)

**M0 — Vertical slice (the demo in this repo).** Settlement zone: walk + hop, scan 3 objects, find 1 audio log, restore power to 1 building → door opens → journal updates. *If this feels lonely-in-a-good-way, the rest is copy-paste.*

**M1 — Full settlement.** Flesh out the hub, multiple buildings, full log set, ambient hum, particles.

**M2 — Second zone (the mine) + streaming.** Load zones on approach. Prove the open-world stitch.

**M3 — All zones + the mystery timeline.** Scanner navigation pings, key-code gating, save system.

**M4 — The relay endgame.** Map reveal + final broadcast. Ending.

**M5 — Polish pass.** Audio mix, dust/fog tuning, controller support, menu, mobile.

---

## 8. Risks & "make-or-break"

- **Traversal feel** — get movement + camera + footsteps right *first*. Everything else is content.
- **Pacing** — gate revelations; an all-at-once open world feels dead.
- **A clear ending** — mysteries need payoff; the ending is designed first (done — see §2).
- **Scope** — resist the round-planet gravity and procedural-everything urges until M2+.

---

## 9. The Demo (M0) — what's included

See `index.html`. It implements the M0 vertical slice:

- Click-to-start pointer-lock, first-person controls.
- WASD movement + **Space for low-G jetpack hop**.
- **Scanner**: look at glowing objects, press **E** to scan → lore tag + journal entry.
- **Audio log**: a terminal you can play → subtitle + journal entry.
- **Power restoration**: a switch that powers the settlement → a locked door opens, windows light up, journal updates.
- **Journal** (press **J**/**Tab**) collecting everything found.
- Fog, low sun, emissive windows, positional hum from the (off-screen) mine, footstep + jetpack audio — all synthesized, zero downloads.
- Win state when everything is scanned and power is restored.
