# DUST — Design Document

> A low-poly post-apocalyptic wasteland survival game for the browser.
> Mad-Max-flavoured: rust, dust, scarcity, and a car you live and die by.
> *(Evolved from the earlier "Hollow" exploration concept — same engine, harsher world.)*

---

## 1. Vision & Pillars

**One-line pitch:** The water's gone and the raiders are coming. Scavenge a dying outpost, keep your war-car fuelled, and drive south toward a rumour of green — piecing together what happened to the convoy that left before you.

**Design pillars** (every decision is judged against these):

1. **The car is the heart.** Driving across the dunes — the weight, the dust plume, the engine note — is the thing you do most. Nail it first.
2. **Scarcity is the engine.** Fuel and water are never quite enough. Every drive is a gamble; every can of gas is a decision.
3. **A wasteland with a memory.** Light survival, but the world *tells a story* through wrecks, graves, and radio logs. You reconstruct what the convoy ran from.
4. **Low-poly as intent.** Clean, deliberate scrap geometry reads as a hand-built wasteland — and keeps the game tiny and fast in a browser.

---

## 2. The World

A sun-blasted desert that reads as open world via dunes + dusty-orange haze + heat shimmer. Hand-crafted landmark zones connected by drivable open sand.

| Zone | Role | Flavour | Beat |
|------|------|---------|------|
| 🏚️ **The Holdout** | Home base, salvage hub (**the demo zone**) | Scrap shanties, dry tank, spiked perimeter | "Everyone left. Why?" |
| 🛢️ **The fuel dumps** | Scattered gas caches | Oil drums, tire stacks, wrecks | Keep the car running |
| 🩸 **Raider camp** | Danger zone | Skull totems, captured rigs | They're coming back |
| 🏜️ **The canyon** | Ambush site / chokepoint | Burned convoy wreckage | Where the water was taken |
| 🌿 **The green rig** | Endgame: water + the truth | South ridge, faint green glow | The convoy's destination |

**Gating:** Fuel limits how far you roam. The pump (water + power) and found caches open the world in layers. The green rig glows on the horizon as a constant pull south.

---

## 3. The Story (light survival)

Scarcity and danger drive moment-to-moment play; the narrative is environmental and optional, rewarding the curious.

**Canonical thread:** The Holdout's water was raided and the tank shot dry. A convoy led by **Rourke** loaded what was left and ran for a rumoured pumping rig on the south ridge — sabotaging the Holdout's own pump on the way out so the raiders couldn't follow. You're whoever came back to an empty outpost. The radio logs and salvage tell you where everyone went and why; the gameplay is getting fuelled and following.

**Told through:** burned convoy wrecks, a bullet-holed reservoir, raider totems, rebar graves with tally marks, a child's doll, oil-paint warnings, and two radio logs that grow more desperate by number.

---

## 4. Core Mechanics

1. **Driving (primary verb).** Arcade handling: throttle/brake-reverse, speed-scaled steering (no spinning in place), terrain-following suspension that tilts the chassis over dunes, spinning/steering wheels, a chase camera, and an engine note that rises with speed.
2. **Fuel.** A gauge that drains as you power the engine. Hits zero → no acceleration → you walk to find a can. The core scarcity loop.
3. **On-foot exploration.** Get out, walk, jump (low hop). You salvage and interact on foot.
4. **Salvage scanner.** Look at wreckage/clues, press **E** → lore + journal entry. Doubles as the "reason to explore."
5. **Radio logs.** Found at terminals; the convoy's voices carry the story.
6. **The pump (power).** Crank it → water returns, the Holdout's lights come on, the gate grinds open. Progress + gating.
7. **Journal.** Auto-collects everything found so the player assembles the timeline.

*Planned (post-M0):* water as a survival meter, raider chase encounters, vehicle upgrades from salvage, day/heat cycle.

---

## 5. Art & Audio Direction

**Visual**
- Flat shading + vertex colours, no textures → tiny files, instant low-poly look.
- **Palette:** sand + rust + scrap, with one warm **fuel-yellow** accent (cans, working lights, scannables) and a hot rust-orange secondary.
- Blazing desert sky, low fog/haze, blowing dust, a big sun disc — atmosphere as free polish.
- Big silhouettes (the green rig, the water tower, warlord totems) — navigate by landmark.

**Audio**
- Synthesized engine that pitches with speed and load — the signature sound.
- Footsteps, jet hop, salvage blips, the pump kicking over, fuel pickup.
- A green-rig hum on the south ridge to pull the player onward (mix ducks under the engine while driving).

---

## 6. Web Tech Stack

- **Three.js** (no-build, ES modules via CDN import map) — see the demo.
- **glTF + Draco** for real assets later; demo is all procedural primitives (zero asset downloads).
- **InstancedMesh** for dunes props/wrecks at scale later.
- **Fog + limited draw distance** for performance *and* mood.
- **Web Audio API** for the engine + positional cues.
- **localStorage / IndexedDB** for saves.
- Watch for: mobile perf, asset-size budget, pointer-lock UX (needs a click-to-start gate).

---

## 7. Build Order (milestones)

**M0 — Vertical slice (this repo).** The Holdout: drive a war-car across dunes with fuel, get out and explore on foot, salvage 6 clues, play 2 radio logs, crank the pump (lights + gate). *If the driving feels good, the rest is content.*

**M1 — Driving game-feel pass.** ✅ *(in the demo)* Handbrake drift, wheel dust plume, skid marks, chassis lean into slides, speed-based FOV, speedometer. *Still to do: controller support, skid-mark fade.*

**M2 — Survival loop.** ✅ *(in the demo)* Water/thirst meter that drains over time — faster in the heat of driving — refilled at the reservoir once the pump runs; empty water dehydrates the hull. *Still to do: a bigger map with streaming, deeper fuel-vs-distance gambles.*

**M3 — Raiders.** ✅ *(in the demo)* Enemy buggies that hunt you while driving, ramming combat (ram fast to wreck them; get rammed and your hull drops), explosions, fuel drops, hull gauge, threat indicator, and a wrecked/game-over state. *Still to do: the raider camp set-piece, ranged attacks.*

**M4 — The drive south.** Canyon ambush set-piece, the green rig, the ending.

**M5 — Upgrades & polish.** Salvage-based car upgrades, day/heat cycle, menu, mobile.

---

## 8. Risks & "make-or-break"

- **Driving feel** — get handling + camera + engine sound right *first*. Everything else is content.
- **Fuel balance** — too tight is frustrating, too loose removes the tension. Tune relentlessly.
- **Scope** — resist real vehicle physics and procedural-everything until M2+; arcade handling is the right call for the web.
- **A reason to explore** — salvage + the green-rig pull keep the empty desert from feeling dead.

---

## 9. The Demo (M0) — what's included

See `index.html`. It implements the M0 vertical slice:

- Click-to-start pointer-lock, first-person on foot.
- **Drive a low-poly war-car**: enter/exit with **F**, WASD to drive, terrain-following suspension + tilt, spinning/steering wheels, chase cam, headlights, an engine that pitches with speed — plus **handbrake drift** (Space/Shift), wheel **dust plume**, **skid marks**, chassis lean into slides, speed-based **FOV**, and a **speedometer**.
- **Fuel gauge** that drains as you drive; **fuel cans** scattered in the dunes to top up (turns red when low).
- **Water/thirst meter** that drains over time (faster while driving) — refill at the reservoir once the pump runs, or dehydration starts eating your hull.
- **Salvage scanner**: look at wreckage/clues, **E** to salvage → lore + journal entry (convoy wreck, dry reservoir, raider totem, graves, child's doll, painted warning).
- **Radio logs** with timed subtitle playback.
- **The water pump**: crank it → windows + street lamps light, the gate grinds open.
- **Raiders**: enemy buggies hunt you while you drive — **ram them at speed** to wreck them (they explode and drop fuel); take hits and your **hull** drops to a wrecked/game-over state. Hull gauge + threat indicator on the HUD.
- **Journal** (J/Tab) collecting everything found.
- **Minimap** (north-up) with point-of-interest dots (salvage, logs, pump, fuel, raiders, reservoir, green rig) + a heading arrow; a **missions panel** (M) tracking objectives; and floating **beacons** marking each objective in the world.
- A wasteland Holdout: scrap shanties, oil drums, tire stacks, perimeter spikes, decorative wrecks, and the distant green rig on the south ridge.
- Sun-blasted sky, blowing dust, all-synthesized audio — zero downloads but Three.js.
- Win state when all salvage + logs are found and the pump is restored.
