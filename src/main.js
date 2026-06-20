// DUST — wasteland survival vertical slice (M0, Mad Max direction)
// Low-poly post-apocalyptic exploration with a drivable war-car. No build step:
// Three.js loads from a CDN via the import map in index.html. See DESIGN.md.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------------------------------------------------------------------------
// Palette — blazing desert: sand + rust, one warm fuel-yellow accent.
// ---------------------------------------------------------------------------
const COL = {
  sky:     0xd98a45,
  fog:     0xc98b55,
  sandLo:  0x9c6f3e,
  sandHi:  0xd9b274,
  rust:    0x7a4326,
  scrap:   0x554636,
  metal:   0x6b5d4a,
  accent:  0xffd24a,   // fuel / UI / scannable glow
  hot:     0xff7b2e,
  dark:    0x241810,
};

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COL.sky);
scene.fog = new THREE.Fog(COL.fog, 30, 170);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 700);

// ---------------------------------------------------------------------------
// Lights — harsh high desert sun + warm bounce.
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xfff0d0, 1.5);
sun.position.set(50, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 220;
sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffd9a0, 0x6b4a28, 0.6));

// Sun disc on the horizon.
{
  const disc = new THREE.Mesh(new THREE.CircleGeometry(34, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe6a0, fog: false }));
  disc.position.set(200, 70, 120); disc.lookAt(0, 30, 0); scene.add(disc);
}

// Heat-glow over the distant rig, where the green/water is rumoured to be.
const rigGlow = new THREE.PointLight(0x66ff88, 1.6, 240, 1.6);
rigGlow.position.set(95, 10, -95);
scene.add(rigGlow);

// ---------------------------------------------------------------------------
// Terrain — sandy dunes, flat under the outpost.
// ---------------------------------------------------------------------------
function hash(x, z) {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  const flat = Math.max(0, 1 - d / 26);
  const dunes = Math.sin(x * 0.04) * Math.cos(z * 0.045) * 6
              + Math.sin(x * 0.11 + 1.3) * 2.2
              + Math.cos(z * 0.09) * 1.8
              + (hash(Math.floor(x * 0.5), Math.floor(z * 0.5)) - 0.5) * 1.2;
  return dunes * (1 - flat);
}

const SIZE = 460, SEG = 200;
const terrainGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).toNonIndexed();
terrainGeo.rotateX(-Math.PI / 2);
{
  const pos = terrainGeo.attributes.position;
  const colors = [];
  const lo = new THREE.Color(COL.sandLo), hi = new THREE.Color(COL.sandHi);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);
    const t = THREE.MathUtils.clamp((y + 3) / 11, 0, 1);
    const c = lo.clone().lerp(hi, t);
    colors.push(c.r, c.g, c.b);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();
}
const terrain = new THREE.Mesh(
  terrainGeo,
  new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 })
);
terrain.receiveShadow = true;
scene.add(terrain);

// Heat-haze dust blowing across the wastes.
const dust = (() => {
  const N = 600, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 90;
    arr[i * 3 + 1] = Math.random() * 14;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe8c98a, size: 0.09, transparent: true, opacity: 0.45 }));
  scene.add(p); return { points: p, arr };
})();

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------
const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...opts });

function box(w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  scene.add(m); return m;
}

const colliders = [];
function addCollider(x, z, r) { colliders.push({ x, z, r }); }

const windows = [];
const lamps = [];
function lamp(x, z) {
  const y = terrainHeight(x, z);
  box(0.16, 4, 0.16, COL.metal, x, y + 2, z);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x140d06, emissive: COL.accent, emissiveIntensity: 0, flatShading: true }));
  head.position.set(x, y + 3.8, z); scene.add(head);
  const light = new THREE.PointLight(COL.accent, 0, 13, 2); light.position.set(x, y + 3.6, z); scene.add(light);
  lamps.push({ head, light });
  addCollider(x, z, 0.4);
}

// A scrap shanty: a box hut with a slanted corrugated roof.
function shanty(x, z, w, color) {
  const y = terrainHeight(x, z);
  const wall = box(w, 2.6, w, color, x, y + 1.3, z, { roughness: 1 });
  const roof = box(w + 0.6, 0.2, w + 0.6, COL.rust, x, y + 2.7, z);
  roof.rotation.z = 0.12;
  addCollider(x, z, w * 0.75);
  // a glowing window slit that lights with power
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x120a04, emissive: COL.accent, emissiveIntensity: 0, flatShading: true }));
  win.position.set(x, y + 1.3, z + w / 2 + 0.02); scene.add(win); windows.push(win);
  return wall;
}

// A rusted car wreck (decor — distinct from your drivable car).
function wreck(x, z, rot) {
  const y = terrainHeight(x, z);
  const g = new THREE.Group();
  g.add(boxLocal(2, 0.6, 3.4, COL.rust, 0, 0.6, 0));
  g.add(boxLocal(1.5, 0.6, 1.6, COL.scrap, 0, 1.1, -0.2));
  g.position.set(x, y, z); g.rotation.y = rot;
  scene.add(g); addCollider(x, z, 1.8);
}
function boxLocal(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z); m.castShadow = true; return m;
}

// ---------------------------------------------------------------------------
// The outpost ("the Holdout")
// ---------------------------------------------------------------------------
shanty(-11, -5, 4, COL.scrap);
shanty(10, -8, 3.4, COL.scrap);
shanty(13, 8, 4.4, COL.rust);
shanty(-13, 10, 3.2, COL.scrap);

// Central garage with the pump + the locked gate.
const garage = box(9, 4.5, 9, COL.scrap, 0, 2.25, 15);
addCollider(0, 15, 5.5);
const garageRoof = box(10, 0.3, 10, COL.rust, 0, 4.6, 15); garageRoof.rotation.z = 0.06;

// The locked scrap gate (raises when the pump is restored).
const gate = box(4, 3.4, 0.4, COL.metal, 0, 1.7, 10.5, { metalness: 0.3 });
gate.userData.closedY = 1.7;

// Tire stacks, oil drums, scrap spikes, fences.
for (let i = 0; i < 10; i++) {
  const x = (hash(i, 2) - 0.5) * 40, z = (hash(i, 5) - 0.5) * 40;
  if (Math.hypot(x, z) < 7) continue;
  const y = terrainHeight(x, z);
  for (let t = 0; t < 3; t++) { // tire stack
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.22, 6, 10), mat(0x1a140e));
    tire.rotation.x = Math.PI / 2; tire.position.set(x, y + 0.2 + t * 0.4, z); scene.add(tire);
  }
}
for (let i = 0; i < 8; i++) {
  const x = (hash(i, 11) - 0.5) * 46, z = (hash(i, 13) - 0.5) * 46;
  if (Math.hypot(x, z) < 8) continue;
  const y = terrainHeight(x, z);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8), mat(i % 2 ? COL.rust : 0x556b2f));
  drum.position.set(x, y + 0.6, z); drum.castShadow = true; scene.add(drum);
}
for (let i = 0; i < 30; i++) { // perimeter spikes
  const a = (i / 30) * Math.PI * 2, r = 32;
  const x = Math.cos(a) * r, z = Math.sin(a) * r, y = terrainHeight(x, z);
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.6, 4), mat(COL.metal));
  spike.position.set(x, y + 0.8, z); scene.add(spike);
}

lamp(-6, 5); lamp(6, 5); lamp(-6, -3); lamp(6, -3); lamp(0, 23);

// A few decorative wrecks scattered out in the dunes.
wreck(-24, 6, 0.5); wreck(20, 18, -0.8); wreck(-18, -16, 1.2); wreck(28, -4, 2.4);

// Distant warlord rig silhouette on the green horizon (where the hum/water is).
{
  const mx = 95, mz = -95;
  for (let i = 0; i < 5; i++) {
    const h = 16 + i * 4;
    box(3.5, h, 3.5, 0x2a1d12, mx + (i - 2) * 7, h / 2, mz + (i % 2) * 5, { emissive: 0x0d2a12, emissiveIntensity: 0.5 });
  }
  box(2, 34, 2, 0x1a120a, mx, 17, mz).rotation.z = 0.07;
}

// ---------------------------------------------------------------------------
// Interactables — wasteland salvage, radio logs, the water pump
// ---------------------------------------------------------------------------
const interactables = [];
function makeInteractable(mesh, data) {
  mesh.userData = { ...data, scanned: false };
  mesh.material = mesh.material.clone();
  mesh.material.emissive = new THREE.Color(COL.accent);
  mesh.material.emissiveIntensity = 0.4;
  interactables.push(mesh); scene.add(mesh); return mesh;
}

// 1. Burned convoy war-rig.
makeInteractable(box(3.4, 1.6, 1.8, COL.rust, -10, terrainHeight(-10, 1) + 0.9, 1), {
  type: 'scan', title: "CONVOY WRECK",
  clue: "A scorched war-rig stripped to the frame. The manifest stencil still reads WATER. Someone burned everything else to take it.",
});
// 2. The dry reservoir (the old water tank).
{
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 4, 10), mat(COL.metal));
  tank.position.set(7, terrainHeight(7, 3) + 2, 3); tank.castShadow = true;
  makeInteractable(tank, {
    type: 'scan', title: "DRY RESERVOIR",
    clue: "The Holdout's water tank — bone dry. A ring of bullet holes near the base. They didn't run out; someone shot it open.",
  });
}
// 3. Raider totem.
{
  const totem = box(0.6, 3.2, 0.6, COL.dark, 16, terrainHeight(16, 12) + 1.6, 12);
  makeInteractable(totem, {
    type: 'scan', title: "RAIDER TOTEM",
    clue: "A pole of welded skulls and steering wheels — a warlord's mark. They were here. They'll come back when the engines cool.",
  });
}
// 4. Grave markers.
{
  const grave = box(0.3, 1.4, 0.1, COL.scrap, -14, terrainHeight(-14, 13) + 0.7, 13);
  box(0.9, 0.2, 0.1, COL.scrap, -14, terrainHeight(-14, 13) + 0.9, 13);
  makeInteractable(grave, {
    type: 'scan', title: "GRAVE MARKERS",
    clue: "Crosses of rebar, no names — only tally scratches. Whoever was counting stopped at forty.",
  });
}
// 5. Child's doll.
{
  const doll = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), mat(0xb24a2a));
  doll.position.set(8, terrainHeight(8, -3) + 0.35, -3);
  makeInteractable(doll, {
    type: 'scan', title: "CHILD'S DOLL",
    clue: "A doll half-buried in the dust. Children rode out with the convoy. The question the Holdout never says aloud: did any make it?",
  });
}
// 6. Warning painted on the gate.
makeInteractable(box(3.6, 1.6, 0.06, COL.scrap, 0, 2.6, 10.2, { emissive: 0x661111, emissiveIntensity: 0.5 }), {
  type: 'scan', title: "WARNING (OIL-PAINT)",
  clue: "Daubed across the gate in engine oil: “NO WATER. KEEP DRIVING.” The strokes are desperate.",
});

// Radio logs.
makeInteractable(box(1.1, 1.5, 0.7, COL.dark, -2, 0.75 + terrainHeight(-2, -8), -8, { emissive: 0x221100 }), {
  type: 'log', title: "RADIO LOG 14",
  clue: "Convoy boss Rourke: water's gone, raiders on our tail, making for the green rig on the south ridge. If you're hearing this, fuel up and follow.",
  lines: [
    "RADIO LOG 14 — Rourke, convoy lead.",
    "Tank's dry. Raiders bled us at the canyon.",
    "There's green on the south ridge — a rig, still pumping. Has to be water.",
    "We're making a run for it. Fuel's the only thing that matters now.",
    "Anyone left at the Holdout: gas up, point south, and don't stop.",
  ],
});
makeInteractable(box(1.1, 1.5, 0.7, COL.dark, 19, 0.75 + terrainHeight(19, -2), -2, { emissive: 0x221100 }), {
  type: 'log', title: "RADIO LOG 22",
  clue: "Rourke, last transmission: they sabotaged the Holdout pump before they left for the rig — to stop the raiders following. The crank's in the garage.",
  lines: [
    "RADIO LOG 22 — Rourke. Last one.",
    "We jammed the Holdout pump on the way out. Didn't want the raiders using it.",
    "If you're the one who came back — the crank's still in the garage.",
    "Get it running, take what water's left, and drive.",
    "South ridge. Green light. Keep the engine running.",
  ],
});

// The water pump (restores power: lights, water, raises the gate).
let pumpOn = false;
makeInteractable(box(1, 1.4, 0.6, COL.metal, 2.4, 1.2 + terrainHeight(2.4, 11), 11, { emissive: 0x332200 }), {
  type: 'pump', title: "WATER PUMP",
  clue: "You cranked the seized pump. It coughs, shudders — then water, brown then clear. Lights flicker on across the Holdout and the gate grinds open.",
});

// Fuel cans (collect on foot to refuel the car).
const fuelCans = [];
function fuelCan(x, z) {
  const y = terrainHeight(x, z);
  const can = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4),
    new THREE.MeshStandardMaterial({ color: 0xb22222, emissive: COL.accent, emissiveIntensity: 0.5, flatShading: true }));
  can.position.set(x, y + 0.4, z); can.userData = { type: 'fuel' };
  scene.add(can); fuelCans.push(can); interactables.push(can);
}
fuelCan(-20, 12); fuelCan(24, -10); fuelCan(-8, -20); fuelCan(30, 6);

// ---------------------------------------------------------------------------
// The drivable war-car
// ---------------------------------------------------------------------------
const car = new THREE.Group();
const chassis = new THREE.Group(); // holds visuals; tilts with terrain
car.add(chassis);
const wheels = [];
{
  chassis.add(boxLocal(2.1, 0.7, 4.2, COL.rust, 0, 0.95, 0));          // body
  chassis.add(boxLocal(1.7, 0.8, 1.8, COL.scrap, 0, 1.55, -0.3));       // cabin
  chassis.add(boxLocal(2.4, 0.4, 0.5, COL.metal, 0, 0.8, 2.2));         // front ram bar
  // front spikes
  for (let s = -1; s <= 1; s++) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 4), mat(COL.metal));
    sp.rotation.x = Math.PI / 2; sp.position.set(s * 0.7, 0.8, 2.6); chassis.add(sp);
  }
  // rear engine block + exhaust stacks
  chassis.add(boxLocal(1.2, 0.7, 1, 0x2a2018, 0, 1.5, -1.7));
  for (const ex of [-0.4, 0.4]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 6), mat(COL.metal));
    pipe.position.set(ex, 2.1, -1.6); chassis.add(pipe);
  }
  // roll cage bars
  chassis.add(boxLocal(0.1, 1, 0.1, COL.metal, -0.8, 2.1, -0.3));
  chassis.add(boxLocal(0.1, 1, 0.1, COL.metal, 0.8, 2.1, -0.3));
  // wheels (geometry baked sideways so rotation.x rolls them)
  const wg = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 12); wg.rotateZ(Math.PI / 2);
  for (const [wx, wz, front] of [[-1.05, 1.4, 1], [1.05, 1.4, 1], [-1.05, -1.4, 0], [1.05, -1.4, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(wx, 0.7, wz);
    const wheel = new THREE.Mesh(wg, mat(0x140d08));
    wheel.castShadow = true; pivot.add(wheel); chassis.add(pivot);
    wheels.push({ pivot, wheel, front });
  }
  // headlights
  const hl = new THREE.PointLight(0xfff0c0, 0, 22, 2); hl.position.set(0, 1, 3); chassis.add(hl);
  car.userData.headlight = hl;
}
car.position.set(-18, terrainHeight(-18, 18), 18);
let carHeading = Math.PI;
scene.add(car);

// ---------------------------------------------------------------------------
// Controls + on-foot movement
// ---------------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);
const player = controls.getObject();
player.position.set(-14, 2, 16);
scene.add(player);

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

const EYE = 1.7, GRAV = -16, JET = 7.5, WALK = 30;
let vy = 0, onGround = true, stepTimer = 0;
const vel = new THREE.Vector3();

function updateWalk(dt) {
  const oldX = player.position.x, oldZ = player.position.z;
  vel.x -= vel.x * 8 * dt; vel.z -= vel.z * 8 * dt;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (f) vel.z -= f * WALK * dt;
  if (r) vel.x += r * WALK * dt;
  controls.moveRight(vel.x * dt); controls.moveForward(-vel.z * dt);
  for (const c of colliders) {
    const dx = player.position.x - c.x, dz = player.position.z - c.z;
    if (Math.hypot(dx, dz) < c.r + 0.6) { player.position.x = oldX; player.position.z = oldZ; break; }
  }
  player.position.x = THREE.MathUtils.clamp(player.position.x, -90, 90);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -90, 90);
  const floor = terrainHeight(player.position.x, player.position.z) + EYE;
  if (keys.Space && onGround) { vy = JET; onGround = false; sfx.jet(); }
  vy += GRAV * dt; player.position.y += vy * dt;
  if (player.position.y <= floor) { if (!onGround) sfx.land(); player.position.y = floor; vy = 0; onGround = true; }
  if (onGround && (f || r)) { stepTimer -= dt; if (stepTimer <= 0) { sfx.step(); stepTimer = 0.42; } }
}

// ---------------------------------------------------------------------------
// Driving (arcade + drift)
// ---------------------------------------------------------------------------
let driving = false;
let carSpeed = 0;                 // forward speed component (m/s)
let fuel = 70;                    // 0..100
const carVel = new THREE.Vector3();
const MAXSPEED = 36, ACCEL = 24, REVERSE = 14, TURN = 1.6, DRAG = 0.55;
const BASE_FOV = 72;

// Wheel dust plume — a recycled particle pool kicked up from the rear wheels.
const plume = (() => {
  const N = 200;
  const pos = new Float32Array(N * 3).fill(-1000);
  const vel = new Float32Array(N * 3);
  const life = new Float32Array(N);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const points = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xd8b884, size: 0.5, transparent: true, opacity: 0.5, depthWrite: false,
  }));
  scene.add(points);
  let cur = 0;
  return {
    emit(x, y, z, n) {
      for (let k = 0; k < n; k++) {
        const i = cur; cur = (cur + 1) % N;
        pos[i*3] = x + (Math.random()-0.5)*0.5;
        pos[i*3+1] = y; pos[i*3+2] = z + (Math.random()-0.5)*0.5;
        vel[i*3] = (Math.random()-0.5)*2; vel[i*3+1] = 1+Math.random()*1.5; vel[i*3+2] = (Math.random()-0.5)*2;
        life[i] = 0.6 + Math.random()*0.4;
      }
    },
    update(dt) {
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { pos[i*3+1] = -1000; continue; }
        pos[i*3] += vel[i*3]*dt; pos[i*3+1] += vel[i*3+1]*dt; pos[i*3+2] += vel[i*3+2]*dt;
        vel[i*3+1] -= 1.5*dt;
      }
      g.attributes.position.needsUpdate = true;
    },
  };
})();

// Skid marks — a recycled pool of dark flat quads laid on the sand when drifting.
const skid = (() => {
  const N = 220, pool = [];
  const geo = new THREE.PlaneGeometry(0.35, 0.9);
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x1a120a, transparent: true, opacity: 0.5, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); pool.push(m);
  }
  let cur = 0;
  return {
    drop(x, z, heading) {
      const m = pool[cur]; cur = (cur + 1) % N;
      m.position.set(x, terrainHeight(x, z) + 0.06, z);
      m.rotation.z = -heading; m.visible = true;
    },
  };
})();
let skidTimer = 0;

function updateCar(dt) {
  const throttle = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
  const handbrake = keys.Space || keys.ShiftLeft || keys.ShiftRight;

  const fwd = new THREE.Vector3(Math.sin(carHeading), 0, Math.cos(carHeading));
  const right = new THREE.Vector3(Math.cos(carHeading), 0, -Math.sin(carHeading));

  // decompose current velocity into forward / lateral
  let vf = carVel.dot(fwd);
  let vl = carVel.dot(right);

  // engine + braking on the forward axis
  if (fuel > 0 && throttle > 0) vf += ACCEL * dt;
  else if (throttle < 0) vf -= REVERSE * dt;
  vf -= vf * DRAG * dt;
  if (handbrake) vf -= vf * 2.2 * dt;
  vf = THREE.MathUtils.clamp(vf, -REVERSE, MAXSPEED);
  if (Math.abs(vf) < 0.05 && throttle === 0) vf = 0;

  // lateral grip — low grip (handbrake) lets the tail slide out
  const gripK = handbrake ? 1.6 : 9;
  vl *= Math.exp(-gripK * dt);

  // steering scales with speed; tighter while drifting
  const grip = THREE.MathUtils.clamp(Math.abs(vf) / 8, 0, 1);
  carHeading += steer * TURN * dt * grip * Math.sign(vf || 1) * (handbrake ? 1.5 : 1);

  if (throttle > 0 && fuel > 0) fuel = Math.max(0, fuel - dt * 1.4);

  // recombine + integrate
  carVel.copy(fwd).multiplyScalar(vf).addScaledVector(right, vl);
  carSpeed = vf;
  const oldX = car.position.x, oldZ = car.position.z;
  car.position.addScaledVector(carVel, dt);

  for (const c of colliders) {
    if (Math.hypot(car.position.x - c.x, car.position.z - c.z) < c.r + 1.4) {
      car.position.x = oldX; car.position.z = oldZ; carVel.multiplyScalar(-0.3); sfx.land(); break;
    }
  }
  car.position.x = THREE.MathUtils.clamp(car.position.x, -90, 90);
  car.position.z = THREE.MathUtils.clamp(car.position.z, -90, 90);

  // sit on terrain + tilt to slope
  const x = car.position.x, z = car.position.z;
  car.position.y = terrainHeight(x, z) + 0.2;
  car.rotation.y = carHeading;
  const hF = terrainHeight(x + fwd.x * 1.6, z + fwd.z * 1.6);
  const hB = terrainHeight(x - fwd.x * 1.6, z - fwd.z * 1.6);
  const hL = terrainHeight(x - right.x * 1.1, z - right.z * 1.1);
  const hR = terrainHeight(x + right.x * 1.1, z + right.z * 1.1);
  chassis.rotation.x = THREE.MathUtils.lerp(chassis.rotation.x, Math.atan2(hF - hB, 3.2), 0.2);
  chassis.rotation.z = THREE.MathUtils.lerp(chassis.rotation.z, Math.atan2(hL - hR, 2.2), 0.2);
  // lean into the slide for feel
  chassis.rotation.z += THREE.MathUtils.clamp(-vl * 0.02, -0.25, 0.25);

  for (const w of wheels) {
    w.wheel.rotation.x += carSpeed * dt * 1.4;
    if (w.front) w.pivot.rotation.y = THREE.MathUtils.lerp(w.pivot.rotation.y, steer * 0.4, 0.3);
  }

  // dust plume + skid marks behind the rear wheels
  const speed = carVel.length();
  const sliding = Math.abs(vl) > 3.5 && speed > 3;
  if (speed > 4 || sliding) {
    const rl = new THREE.Vector3(x, car.position.y, z).addScaledVector(fwd, -1.4).addScaledVector(right, -1.05);
    const rr = new THREE.Vector3(x, car.position.y, z).addScaledVector(fwd, -1.4).addScaledVector(right, 1.05);
    const amount = sliding ? 3 : 1;
    plume.emit(rl.x, rl.y, rl.z, amount); plume.emit(rr.x, rr.y, rr.z, amount);
    skidTimer -= dt;
    if (sliding && skidTimer <= 0) { skid.drop(rl.x, rl.z, carHeading); skid.drop(rr.x, rr.z, carHeading); skidTimer = 0.04; }
  }

  // chase camera + speed-based FOV (sense of speed)
  const camPos = new THREE.Vector3(x - fwd.x * 9, car.position.y + 5, z - fwd.z * 9);
  camera.position.lerp(camPos, 0.12);
  camera.lookAt(x + fwd.x * 4, car.position.y + 1.6, z + fwd.z * 4);
  const targetFov = BASE_FOV + (speed / MAXSPEED) * 16;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, 0.1); camera.updateProjectionMatrix();

  // HUD speedometer
  speedoEl.textContent = Math.round(speed * 7) + ' km/h';

  sfx.setEngine(speed / MAXSPEED, fuel > 0 && throttle > 0);
}

function enterCar() {
  driving = true; sfx.engineOn(); car.userData.headlight.intensity = 1.2;
  hintEl.classList.remove('show'); crosshair.style.display = 'none';
  speedoEl.classList.add('show');
}
function exitCar() {
  driving = false; sfx.engineOff(); car.userData.headlight.intensity = 0;
  carVel.set(0, 0, 0); carSpeed = 0;
  camera.fov = BASE_FOV; camera.updateProjectionMatrix();
  const side = new THREE.Vector3(Math.cos(carHeading), 0, -Math.sin(carHeading));
  player.position.set(car.position.x + side.x * 2.5, terrainHeight(car.position.x, car.position.z) + EYE, car.position.z + side.z * 2.5);
  crosshair.style.display = ''; speedoEl.classList.remove('show');
}

// ---------------------------------------------------------------------------
// Audio (synthesized: engine, hum, footsteps, UI)
// ---------------------------------------------------------------------------
const sfx = (() => {
  let ctx, master, engOsc, engGain, engFilt;
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    engOsc = ctx.createOscillator(); engOsc.type = 'sawtooth'; engOsc.frequency.value = 60;
    engFilt = ctx.createBiquadFilter(); engFilt.type = 'lowpass'; engFilt.frequency.value = 600;
    engGain = ctx.createGain(); engGain.gain.value = 0;
    engOsc.connect(engFilt); engFilt.connect(engGain); engGain.connect(master); engOsc.start();
  }
  function blip(freq, dur, type = 'square', vol = 0.18) {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, freq) {
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  return {
    init,
    step() { noise(0.12, 0.1, 450); },
    jet() { noise(0.5, 0.22, 900); },
    land() { noise(0.18, 0.16, 320); },
    scan() { blip(880, 0.12); setTimeout(() => blip(1320, 0.1), 90); },
    pump() { blip(180, 0.6, 'sawtooth', 0.25); setTimeout(() => blip(360, 0.5, 'sawtooth', 0.2), 140); },
    fuel() { blip(660, 0.1); setTimeout(() => blip(990, 0.1), 80); },
    engineOn() { if (engGain) engGain.gain.value = 0.0; },
    engineOff() { if (engGain) engGain.gain.value = 0; },
    setEngine(spd, powering) {
      if (!engOsc) return;
      engOsc.frequency.value = 50 + spd * 160 + (powering ? 30 : 0);
      engFilt.frequency.value = 500 + spd * 1400;
      engGain.gain.value = 0.06 + spd * 0.14 + (powering ? 0.04 : 0);
    },
  };
})();

// ---------------------------------------------------------------------------
// Targeting / interaction (on foot)
// ---------------------------------------------------------------------------
const ray = new THREE.Raycaster(); ray.far = 6;
const center = new THREE.Vector2(0, 0);
let target = null;
const crosshair = document.getElementById('crosshair');
const hintEl = document.getElementById('hint');

function updateTargeting() {
  ray.setFromCamera(center, camera);
  const hits = ray.intersectObjects(interactables, false);
  target = hits.length ? hits[0].object : null;
  // also offer to enter the car when close
  const nearCar = player.position.distanceTo(car.position) < 4.5;
  if (target) {
    crosshair.classList.add('active');
    const d = target.userData;
    const verb = d.type === 'log' ? 'play log' : d.type === 'pump' ? 'crank pump'
      : d.type === 'fuel' ? 'grab fuel' : 'salvage';
    hintEl.innerHTML = (d.scanned && d.type === 'scan') ? `${d.title} — salvaged`
      : `<b>E</b> · ${verb}${d.title ? ' — ' + d.title : ''}`;
    hintEl.classList.add('show');
  } else if (nearCar) {
    crosshair.classList.remove('active');
    hintEl.innerHTML = `<b>F</b> · drive`;
    hintEl.classList.add('show');
  } else {
    crosshair.classList.remove('active');
    hintEl.classList.remove('show');
  }
}

addEventListener('keydown', e => {
  if (!controls.isLocked) return;
  if (e.code === 'KeyF') {
    if (driving) exitCar();
    else if (player.position.distanceTo(car.position) < 4.5) enterCar();
  }
  if (e.code === 'KeyE' && !driving && target) interact(target);
  if (e.code === 'KeyJ' || e.code === 'Tab') { e.preventDefault(); journalEl.classList.toggle('hidden'); }
});

function interact(obj) {
  const d = obj.userData;
  if (d.type === 'scan') {
    if (d.scanned) return;
    d.scanned = true; obj.material.emissiveIntensity = 0; sfx.scan();
    addJournal(d.title, d.clue); scannedCount++;
  } else if (d.type === 'log') {
    if (!d.scanned) { d.scanned = true; addJournal(d.title, d.clue); logsCount++; }
    sfx.scan(); playLog(d.lines);
  } else if (d.type === 'pump') {
    if (pumpOn) return;
    pumpOn = true; obj.material.emissive.set(0x33ff66); obj.material.emissiveIntensity = 0.9; sfx.pump();
    addJournal(d.title, d.clue);
    windows.forEach(w => w.material.emissiveIntensity = 1);
    lamps.forEach(l => { l.head.material.emissiveIntensity = 1; l.light.intensity = 1.6; });
  } else if (d.type === 'fuel') {
    fuel = Math.min(100, fuel + 35); sfx.fuel();
    obj.visible = false;
    const i = interactables.indexOf(obj); if (i >= 0) interactables.splice(i, 1);
    flashSub('Fuel topped up. The wasteland runs on it.');
  }
  updateObjective(); checkWin();
}

// ---------------------------------------------------------------------------
// Subtitles / logs
// ---------------------------------------------------------------------------
const subEl = document.getElementById('subtitle');
let logTimer = null;
function playLog(lines) {
  if (logTimer) clearTimeout(logTimer);
  let i = 0;
  const next = () => {
    if (i >= lines.length) { subEl.classList.remove('show'); return; }
    subEl.textContent = lines[i++]; subEl.classList.add('show');
    logTimer = setTimeout(next, 3200);
  };
  next();
}
let flashTimer = null;
function flashSub(text) {
  subEl.textContent = text; subEl.classList.add('show');
  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => subEl.classList.remove('show'), 2500);
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------
const journalEl = document.getElementById('journal');
const journalList = document.getElementById('journal-list');
const recorded = new Set();
function addJournal(title, text) {
  if (recorded.has(title)) return;
  recorded.add(title);
  const empty = journalList.querySelector('.empty'); if (empty) empty.remove();
  const li = document.createElement('li'); li.innerHTML = `<b>${title}</b>${text}`;
  journalList.appendChild(li);
}

// ---------------------------------------------------------------------------
// Objectives / win + fuel HUD
// ---------------------------------------------------------------------------
let scannedCount = 0, logsCount = 0;
const SCAN_GOAL = 6, LOG_GOAL = 2;
const objScan = document.getElementById('obj-scan');
const objLog = document.getElementById('obj-log');
const objPump = document.getElementById('obj-power');
const fuelFill = document.getElementById('fuel-fill');
const speedoEl = document.getElementById('speedo');
function updateObjective() {
  objScan.textContent = `Salvage ${scannedCount}/${SCAN_GOAL}`;
  objScan.classList.toggle('done', scannedCount >= SCAN_GOAL);
  objLog.textContent = `Logs ${logsCount}/${LOG_GOAL}`;
  objLog.classList.toggle('done', logsCount >= LOG_GOAL);
  objPump.textContent = `Pump: ${pumpOn ? 'ONLINE' : 'OFFLINE'}`;
  objPump.classList.toggle('online', pumpOn);
}
let won = false;
function checkWin() {
  if (won || !(scannedCount >= SCAN_GOAL && logsCount >= LOG_GOAL && pumpOn)) return;
  won = true;
  setTimeout(() => { controls.unlock(); document.getElementById('win').classList.remove('hidden'); }, 1200);
}

// ---------------------------------------------------------------------------
// Overlays + pointer lock
// ---------------------------------------------------------------------------
const overlay = document.getElementById('overlay');
document.getElementById('start-btn').onclick = () => { sfx.init(); controls.lock(); };
document.getElementById('win-close').onclick = () => { document.getElementById('win').classList.add('hidden'); controls.lock(); };
controls.addEventListener('lock', () => overlay.classList.add('hidden'));
controls.addEventListener('unlock', () => { if (!won) overlay.classList.remove('hidden'); });

function updateGate(dt) {
  if (!pumpOn) return;
  const open = gate.userData.closedY + 3.4;
  if (gate.position.y < open) gate.position.y = Math.min(open, gate.position.y + dt * 1.5);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (controls.isLocked) {
    if (driving) updateCar(dt);
    else { updateWalk(dt); updateTargeting(); }
    updateGate(dt);
    fuelFill.style.width = fuel + '%';
    fuelFill.style.background = fuel < 20 ? '#ff5a3c' : 'var(--accent)';
    // green-rig hum swells as you approach the south ridge
    const ref = driving ? car.position : player.position;
    const d = ref.distanceTo(rigGlow.position);
    void d; // (reserved for hum mix; engine dominates while driving)
  }
  // drifting dust around the active reference point
  const ref = driving ? car.position : player.position;
  const da = dust.arr;
  for (let i = 0; i < da.length; i += 3) {
    da[i] += dt * 1.2;
    if (da[i] - ref.x > 45) da[i] -= 90;
    if (da[i] - ref.x < -45) da[i] += 90;
    if (da[i + 2] - ref.z > 45) da[i + 2] -= 90;
    if (da[i + 2] - ref.z < -45) da[i + 2] += 90;
  }
  dust.points.geometry.attributes.position.needsUpdate = true;
  plume.update(dt);
  renderer.render(scene, camera);
}
updateObjective();
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
