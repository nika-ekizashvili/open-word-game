// HOLLOW — settlement vertical slice (M0)
// A low-poly planet exploration mystery. No build step: Three.js comes from a CDN
// via the import map in index.html. See DESIGN.md for the full concept.

import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------------------------------------------------------------------------
// Palette (one cold base + one warm emissive accent — see DESIGN.md §5)
// ---------------------------------------------------------------------------
const COL = {
  sky:      0x0c1320,
  fog:      0x0e1626,
  ground:   0x223047,
  groundHi: 0x2e4366,
  dome:     0x3b536f,
  wall:     0x2c3e57,
  metal:    0x4a5870,
  accent:   0xffb347,   // warm windows / scannable glow
  accentDim:0x5a4326,
  cold:     0x8fd3ff,
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
scene.fog = new THREE.Fog(COL.fog, 18, 130);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 600);

// ---------------------------------------------------------------------------
// Lights — a low, cold sun + faint fill. Atmosphere is free polish.
// ---------------------------------------------------------------------------
const sun = new THREE.DirectionalLight(0xbcd6ff, 1.1);
sun.position.set(-40, 32, -20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 160;
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x4a6a99, 0x0a0e14, 0.45));

// A distant glow on the horizon where the mine is (the hum comes from there).
const mineGlow = new THREE.PointLight(0xff7a33, 2.2, 220, 1.6);
mineGlow.position.set(90, 8, -90);
scene.add(mineGlow);

// ---------------------------------------------------------------------------
// Low-poly terrain: a displaced, flat-shaded, vertex-coloured plane.
// The settlement area is kept flat; hills rise toward the horizon.
// ---------------------------------------------------------------------------
function hash(x, z) { // cheap deterministic pseudo-noise
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  const flat = Math.max(0, 1 - d / 28);            // flat disc under the settlement
  const rolling = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 4
                + Math.sin(x * 0.13 + 1.3) * 1.2
                + (hash(Math.floor(x), Math.floor(z)) - 0.5) * 1.5;
  return rolling * (1 - flat);
}

const SIZE = 360, SEG = 180;
const terrainGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG).toNonIndexed();
terrainGeo.rotateX(-Math.PI / 2);
{
  const pos = terrainGeo.attributes.position;
  const colors = [];
  const lo = new THREE.Color(COL.ground), hi = new THREE.Color(COL.groundHi);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);
    const t = THREE.MathUtils.clamp((y + 2) / 8, 0, 1);
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

// ---------------------------------------------------------------------------
// Sky & atmosphere: starfield, two moons, drifting dust motes
// ---------------------------------------------------------------------------
// Starfield — points scattered on a far dome.
{
  const N = 1200, pos = [];
  for (let i = 0; i < N; i++) {
    const u = Math.random(), v = Math.random();
    const theta = u * Math.PI * 2, phi = Math.acos(2 * v - 1);
    const r = 420;
    const y = Math.abs(r * Math.cos(phi)); // upper hemisphere only
    pos.push(r * Math.sin(phi) * Math.cos(theta), y, r * Math.sin(phi) * Math.sin(theta));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe2ff, size: 1.4, sizeAttenuation: false, fog: false }));
  scene.add(stars);
}
// Two moons hanging over the settlement.
function moon(x, y, z, r, color, emissive) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.6, flatShading: true, fog: false }));
  m.position.set(x, y, z); scene.add(m); return m;
}
moon(-160, 120, -260, 26, 0x5a3a2a, 0x8a4a22);    // big rusty moon
moon(180, 180, -200, 12, 0x33425a, 0x223a55);     // small cold moon
// Drifting dust motes near the player (atmosphere is free polish).
const dust = (() => {
  const N = 400, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    arr[i*3] = (Math.random()-0.5)*80; arr[i*3+1] = Math.random()*16; arr[i*3+2] = (Math.random()-0.5)*80;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x9fb6d0, size: 0.06, transparent: true, opacity: 0.5 }));
  scene.add(p); return { points: p, arr };
})();

// ---------------------------------------------------------------------------
// Build helpers
// ---------------------------------------------------------------------------
const mat = (color, opts = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts });

function box(w, h, d, color, x, y, z, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  scene.add(m); return m;
}

const colliders = []; // simple cylinder colliders {x, z, r}
function addCollider(x, z, r) { colliders.push({ x, z, r }); }

// Window panes + street-lamp heads that light up when power is restored.
const windows = [];
const streetLamps = [];

// A street lamp: post + emissive head (dark until power is restored).
function streetLamp(x, z) {
  const y = terrainHeight(x, z);
  const post = box(0.18, 4, 0.18, COL.metal, x, y + 2, z);
  const arm = box(1.2, 0.15, 0.15, COL.metal, x + 0.5, y + 3.9, z);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x10161f, emissive: COL.accent, emissiveIntensity: 0, flatShading: true }));
  head.position.set(x + 1, y + 3.8, z); scene.add(head);
  const light = new THREE.PointLight(COL.accent, 0, 14, 2); light.position.set(x + 1, y + 3.6, z); scene.add(light);
  streetLamps.push({ head, light });
  addCollider(x, z, 0.4);
}
function addWindows(parent, count, ring) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x10161f, emissive: COL.accentDim, emissiveIntensity: 0 })
    );
    w.position.set(Math.cos(a) * ring, 1.4, Math.sin(a) * ring);
    w.lookAt(parent.position.x, 1.4, parent.position.z);
    w.position.x += parent.position.x; w.position.z += parent.position.z;
    scene.add(w); windows.push(w);
  }
}

// A dome dwelling: cylinder base + hemisphere roof.
function dome(x, z, radius, color) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.4, 7), mat(color));
  base.position.y = 1.2; base.castShadow = base.receiveShadow = true;
  const roof = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), mat(COL.dome));
  roof.position.y = 2.4; roof.castShadow = true;
  g.add(base, roof); g.position.set(x, 0, z); scene.add(g);
  addCollider(x, z, radius + 0.4);
  addWindows({ position: { x, z } }, 5, radius + 0.02);
  return g;
}

// ---------------------------------------------------------------------------
// The settlement
// ---------------------------------------------------------------------------
dome(-10, -6, 3.2, COL.wall);
dome(9, -9, 2.8, COL.wall);
dome(12, 7, 3.4, COL.wall);
dome(-12, 9, 2.6, COL.wall);

// Central plaza building with the locked door + breaker.
const hub = box(8, 4, 8, COL.wall, 0, 2, 14);
addCollider(0, 14, 5);
const hubRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.2, 4), mat(COL.dome));
hubRoof.position.set(0, 5.1, 14); hubRoof.rotation.y = Math.PI / 4; hubRoof.castShadow = true;
scene.add(hubRoof);
addWindows({ position: { x: 0, z: 14 } }, 6, 4.05);

// The locked door (slides up when power is restored).
const door = box(2.4, 3.2, 0.3, COL.metal, 0, 1.6, 10.0, { metalness: 0.3 });
door.userData.closedY = 1.6;

// Your landing pod (home base marker).
const pod = new THREE.Group();
const podBody = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 2.2, 4, 8), mat(COL.metal, { metalness: 0.4 }));
podBody.rotation.z = Math.PI / 2; podBody.position.y = 1.8; podBody.castShadow = true;
const podLeg = (ax, az) => { const l = box(0.25, 2, 0.25, COL.metal, ax, 0.9, az); l.castShadow = true; };
pod.add(podBody); scene.add(pod); pod.position.set(-22, 0, 18);
podLeg(-23, 17); podLeg(-21, 17); podLeg(-23, 19); podLeg(-21, 19);
addCollider(-22, 18, 2.4);

// Antenna / relay silhouette (landmark; endgame zone in the full game).
const antenna = box(0.4, 16, 0.4, COL.metal, 22, 8, -2);
const dish = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2.2),
  mat(COL.metal, { side: THREE.DoubleSide }));
dish.position.set(22, 15, -2); dish.rotation.x = Math.PI / 2.5; scene.add(dish);
addCollider(22, -2, 1);

// Scattered crates (instanced-style props, individually placed for the slice).
for (let i = 0; i < 14; i++) {
  const x = (hash(i, 1) - 0.5) * 44, z = (hash(i, 7) - 0.5) * 44;
  if (Math.hypot(x, z) < 6) continue;
  const s = 0.8 + hash(i, 3) * 0.6;
  box(s, s, s, i % 2 ? COL.metal : COL.dome, x, terrainHeight(x, z) + s / 2, z).rotation.y = hash(i, 9) * 3;
}

// Street lamps lining the plaza path (light up with power).
streetLamp(-6, 6); streetLamp(6, 6); streetLamp(-6, -2); streetLamp(6, -2); streetLamp(0, 22);

// Pipes connecting the domes to the hub (life-support conduits).
function pipe(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  const p = box(len, 0.3, 0.3, COL.metal, (x1 + x2) / 2, 0.5, (z1 + z2) / 2, { metalness: 0.3 });
  p.rotation.y = -Math.atan2(dz, dx);
}
pipe(-10, -6, 0, 14); pipe(9, -9, 0, 14); pipe(12, 7, 0, 14); pipe(-12, 9, 0, 14);

// Water / oxygen tower (a tall landmark on the edge of the settlement).
{
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    box(0.25, 9, 0.25, COL.metal, -26 + Math.cos(a) * 1.6, 4.5, -10 + Math.sin(a) * 1.6);
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 3.5, 8), mat(COL.dome));
  tank.position.set(-26, 10.5, -10); tank.castShadow = true; scene.add(tank);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.4, 8), mat(COL.metal));
  cap.position.set(-26, 12.9, -10); scene.add(cap);
  addCollider(-26, -10, 2.2);
}

// Low perimeter fence posts (the settlement's edge).
for (let i = 0; i < 28; i++) {
  const a = (i / 28) * Math.PI * 2, r = 34;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  box(0.15, 1.4, 0.15, COL.metal, x, terrainHeight(x, z) + 0.7, z);
}

// Distant mine rig silhouette on the horizon, where the hum comes from.
{
  const mx = 90, mz = -90;
  for (let i = 0; i < 5; i++) {
    const h = 14 + i * 4;
    box(3, h, 3, 0x161d28, mx + (i - 2) * 6, h / 2, mz + (i % 2) * 5, { emissive: 0x1a0d00, emissiveIntensity: 0.4 });
  }
  const derrick = box(2, 30, 2, 0x10151e, mx, 15, mz);
  derrick.rotation.z = 0.08;
}

// ---------------------------------------------------------------------------
// Interactables — the heart of the slice (scan / log / power)
// ---------------------------------------------------------------------------
const interactables = [];
function makeInteractable(mesh, data) {
  mesh.userData = { ...data, scanned: false };
  // soft glow so the player can find them in the gloom
  mesh.material = mesh.material.clone();
  mesh.material.emissive = new THREE.Color(COL.accent);
  mesh.material.emissiveIntensity = 0.35;
  interactables.push(mesh);
  scene.add(mesh);
  return mesh;
}

// 1. Child's drawing on an easel.
{
  const easel = box(1.4, 1.6, 0.1, 0xe9e2cf, -10, terrainHeight(-10, 1) + 1.4, 1);
  makeInteractable(easel, {
    type: 'scan', title: "CHILD'S DRAWING",
    clue: "A crayon drawing: a round planet with a single staring eye at its centre. Signed “Mira, age 6.”",
  });
}
// 2. Untouched meal on a table.
{
  const table = box(2.2, 0.2, 1.4, 0x6b5436, 6, terrainHeight(6, 2) + 1.0, 2);
  box(0.3, 1, 0.3, 0x6b5436, 5, terrainHeight(6, 2) + 0.5, 1.4);
  box(0.3, 1, 0.3, 0x6b5436, 7, terrainHeight(6, 2) + 0.5, 2.6);
  makeInteractable(table, {
    type: 'scan', title: "UNTOUCHED MEAL",
    clue: "Three plates, food long fossilised. The chairs are pushed back as if everyone stood up at the same instant.",
  });
}
// 3. Evac rover, nose pointed away from the mine.
{
  const rover = box(3, 1.4, 1.8, COL.metal, 16, terrainHeight(16, 12) + 0.9, 12, { metalness: 0.3 });
  rover.rotation.y = -0.6;
  makeInteractable(rover, {
    type: 'scan', title: "EVAC ROVER #7",
    clue: "Charge depleted, nose pointed at the open sky — not toward the mine. They left fast, and they left away.",
  });
}
// 4. Operations terminal — plays a data log.
{
  const term = box(1.2, 1.6, 0.8, 0x1a2230, -2, 0.8 + 0, -8, { emissive: 0x123 });
  makeInteractable(term, {
    type: 'log', title: "DATA LOG 14",
    clue: "Ops log 14 — Mara Vey: the core scan came back wrong. There's a cavity. The planet is hollow, and it answers when we dig.",
    lines: [
      "OPS LOG 14 — Foreman Mara Vey, recording.",
      "We hit the cavity at 600 metres. The core scan… it's not rock down there.",
      "It's a shell. The planet is hollow.",
      "And when the drills stop — you can hear it. Something underneath, humming back.",
      "I've ordered the transports loaded. We are not digging any deeper.",
    ],
  });
}
// 5. Main breaker — restores power.
let powerOn = false;
{
  const breaker = box(0.9, 1.4, 0.5, COL.metal, 2.2, 1.2, 10.4, { emissive: 0x331100 });
  makeInteractable(breaker, {
    type: 'power', title: "MAIN BREAKER",
    clue: "You threw the main breaker. The settlement's windows flickered back to life — and somewhere, a door unlocked.",
  });
}
// 6. Memorial stone — names with no dates of death.
{
  const stone = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 0.5), mat(0x3a4252));
  stone.position.set(-14, terrainHeight(-14, 13) + 1, 13); stone.rotation.y = 0.2;
  makeInteractable(stone, {
    type: 'scan', title: "MEMORIAL STONE",
    clue: "Eleven names carved here. Each has a birth date. None has a date of death. They weren't buried — they were listed as “gone under.”",
  });
}
// 7. A child's toy left in the dirt.
{
  const toy = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), mat(0xd23b3b));
  toy.position.set(8, terrainHeight(8, -3) + 0.4, -3);
  makeInteractable(toy, {
    type: 'scan', title: "ABANDONED TOY",
    clue: "A child's ball, half-buried. Whoever dropped it was carried, or ran — children don't leave these behind by choice.",
  });
}
// 8. Warning daubed on the hub wall.
{
  const graffiti = box(3, 1.6, 0.06, 0x2c3e57, 0, 2.2, 9.7, { emissive: 0x661111, emissiveIntensity: 0.5 });
  makeInteractable(graffiti, {
    type: 'scan', title: "WARNING (PAINTED)",
    clue: "Scrawled in reactor-paint across the door: “DON'T LET IT FINISH COUNTING.” The brushstrokes are frantic.",
  });
}
// 9. Second data log, up by the relay antenna.
{
  const term2 = box(1.2, 1.6, 0.8, 0x1a2230, 19, 0.8, -2, { emissive: 0x112 });
  makeInteractable(term2, {
    type: 'log', title: "DATA LOG 22",
    clue: "Ops log 22 — Mara Vey: the hum has rhythm now. It's counting. We answered once and it learned. Last transport leaves at dawn.",
    lines: [
      "OPS LOG 22 — Vey. Last one I'll record from the surface.",
      "The hum changed three days ago. It has a rhythm now.",
      "Doctor Sol thinks it's… counting. Toward something.",
      "We pinged it back once, to test. It learned the pattern in an hour.",
      "Last transport leaves at dawn. If you're hearing this — don't dig, and don't answer it.",
    ],
  });
}

// ---------------------------------------------------------------------------
// Controls + movement (low-G hop — the #1 thing to nail, DESIGN.md §8)
// ---------------------------------------------------------------------------
const controls = new PointerLockControls(camera, document.body);
const player = controls.getObject();
player.position.set(-16, 2, 14);
scene.add(player);

const keys = {};
addEventListener('keydown', e => { keys[e.code] = true; });
addEventListener('keyup', e => { keys[e.code] = false; });

const EYE = 1.7, GRAV = -16, JET = 7.5, SPEED = 30;
let vy = 0, onGround = true;
const vel = new THREE.Vector3();

function groundY(x, z) { return terrainHeight(x, z); }

function updateMovement(dt) {
  const oldX = player.position.x, oldZ = player.position.z;

  // horizontal
  vel.x -= vel.x * 8 * dt;
  vel.z -= vel.z * 8 * dt;
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const r = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (f) vel.z -= f * SPEED * dt;
  if (r) vel.x += r * SPEED * dt;
  controls.moveRight(vel.x * dt);
  controls.moveForward(-vel.z * dt);

  // collision: push out of building cylinders
  for (const c of colliders) {
    const dx = player.position.x - c.x, dz = player.position.z - c.z;
    if (Math.hypot(dx, dz) < c.r + 0.6) { player.position.x = oldX; player.position.z = oldZ; break; }
  }
  // keep inside the playfield
  player.position.x = THREE.MathUtils.clamp(player.position.x, -70, 70);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -70, 70);

  // vertical — low-G jetpack hop
  const floor = groundY(player.position.x, player.position.z) + EYE;
  if ((keys.Space) && onGround) { vy = JET; onGround = false; sfx.jet(); }
  vy += GRAV * dt;
  player.position.y += vy * dt;
  if (player.position.y <= floor) {
    if (!onGround) sfx.land();
    player.position.y = floor; vy = 0; onGround = true;
  }

  // footstep cadence
  if (onGround && (f || r)) {
    stepTimer -= dt;
    if (stepTimer <= 0) { sfx.step(); stepTimer = 0.42; }
  }
}
let stepTimer = 0;

// ---------------------------------------------------------------------------
// Audio — all synthesized (zero downloads). The mine hum is the signature.
// ---------------------------------------------------------------------------
const sfx = (() => {
  let ctx, hum, humGain, master;
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    // continuous low hum from the mine
    hum = ctx.createOscillator(); hum.type = 'sine'; hum.frequency.value = 52;
    const hum2 = ctx.createOscillator(); hum2.type = 'sine'; hum2.frequency.value = 78;
    humGain = ctx.createGain(); humGain.gain.value = 0;
    hum.connect(humGain); hum2.connect(humGain); humGain.connect(master);
    hum.start(); hum2.start();
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
    setHum(v) { if (humGain) humGain.gain.value = v; },
    step() { noise(0.12, 0.12, 500); },
    jet() { noise(0.5, 0.25, 900); },
    land() { noise(0.18, 0.18, 350); },
    scan() { blip(880, 0.12); setTimeout(() => blip(1320, 0.1), 90); },
    power() { blip(220, 0.5, 'sawtooth', 0.25); setTimeout(() => blip(440, 0.4, 'sawtooth', 0.2), 120); },
    deny() { blip(160, 0.2, 'sawtooth', 0.15); },
  };
})();

// ---------------------------------------------------------------------------
// Interaction: raycast from screen centre, then E to act
// ---------------------------------------------------------------------------
const ray = new THREE.Raycaster();
ray.far = 6;
const center = new THREE.Vector2(0, 0);
let target = null;

const crosshair = document.getElementById('crosshair');
const hintEl = document.getElementById('hint');

function updateTargeting() {
  ray.setFromCamera(center, camera);
  const hits = ray.intersectObjects(interactables, false);
  target = hits.length ? hits[0].object : null;
  if (target) {
    crosshair.classList.add('active');
    const d = target.userData;
    const verb = d.type === 'log' ? 'play log' : d.type === 'power' ? 'restore power' : 'scan';
    hintEl.innerHTML = d.scanned && d.type === 'scan'
      ? `${d.title} — already scanned`
      : `<b>E</b> · ${verb} — ${d.title}`;
    hintEl.classList.add('show');
  } else {
    crosshair.classList.remove('active');
    hintEl.classList.remove('show');
  }
}

addEventListener('keydown', e => {
  if (e.code === 'KeyE' && target && controls.isLocked) interact(target);
  if ((e.code === 'KeyJ' || e.code === 'Tab')) { e.preventDefault(); toggleJournal(); }
});

function interact(obj) {
  const d = obj.userData;
  if (d.type === 'scan') {
    if (d.scanned) return;
    d.scanned = true; obj.material.emissiveIntensity = 0.0;
    sfx.scan(); addJournal(d.title, d.clue); scannedCount++;
  } else if (d.type === 'log') {
    if (!d.scanned) { d.scanned = true; addJournal(d.title, d.clue); logsCount++; }
    sfx.scan(); playLog(d.lines);
  } else if (d.type === 'power') {
    if (powerOn) return;
    powerOn = true; obj.material.emissiveIntensity = 0.9; obj.material.emissive.set(0x33ff66);
    sfx.power(); addJournal(d.title, d.clue);
    windows.forEach(w => { w.material.emissive.set(COL.accent); w.material.emissiveIntensity = 1.0; });
    streetLamps.forEach(l => { l.head.material.emissiveIntensity = 1.0; l.light.intensity = 1.6; });
  }
  updateObjective();
  checkWin();
}

// ---------------------------------------------------------------------------
// Log subtitle playback
// ---------------------------------------------------------------------------
const subEl = document.getElementById('subtitle');
let logTimer = null;
function playLog(lines) {
  if (logTimer) clearTimeout(logTimer);
  let i = 0;
  const next = () => {
    if (i >= lines.length) { subEl.classList.remove('show'); return; }
    subEl.textContent = lines[i++];
    subEl.classList.add('show');
    logTimer = setTimeout(next, 3200);
  };
  next();
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
  const empty = journalList.querySelector('.empty');
  if (empty) empty.remove();
  const li = document.createElement('li');
  li.innerHTML = `<b>${title}</b>${text}`;
  journalList.appendChild(li);
}
function toggleJournal() { journalEl.classList.toggle('hidden'); }

// ---------------------------------------------------------------------------
// Objective tracking + win
// ---------------------------------------------------------------------------
let scannedCount = 0, logsCount = 0;
const objScan = document.getElementById('obj-scan');
const objLog = document.getElementById('obj-log');
const objPower = document.getElementById('obj-power');
const SCAN_GOAL = 6, LOG_GOAL = 2;
function updateObjective() {
  objScan.textContent = `Scanned ${scannedCount}/${SCAN_GOAL}`;
  objScan.classList.toggle('done', scannedCount >= SCAN_GOAL);
  objLog.textContent = `Logs ${logsCount}/${LOG_GOAL}`;
  objLog.classList.toggle('done', logsCount >= LOG_GOAL);
  objPower.textContent = `Power: ${powerOn ? 'ONLINE' : 'OFFLINE'}`;
  objPower.classList.toggle('online', powerOn);
}
let won = false;
function checkWin() {
  if (won || !(scannedCount >= SCAN_GOAL && logsCount >= LOG_GOAL && powerOn)) return;
  won = true;
  setTimeout(() => {
    controls.unlock();
    document.getElementById('win').classList.remove('hidden');
  }, 1200);
}

// ---------------------------------------------------------------------------
// Start / pause overlay + pointer lock
// ---------------------------------------------------------------------------
const overlay = document.getElementById('overlay');
document.getElementById('start-btn').onclick = () => { sfx.init(); controls.lock(); };
document.getElementById('win-close').onclick = () => {
  document.getElementById('win').classList.add('hidden'); controls.lock();
};
controls.addEventListener('lock', () => overlay.classList.add('hidden'));
controls.addEventListener('unlock', () => { if (!won) overlay.classList.remove('hidden'); });

// ---------------------------------------------------------------------------
// Animate the door opening when power comes on
// ---------------------------------------------------------------------------
function updateDoor(dt) {
  if (!powerOn) return;
  const open = door.userData.closedY + 3.2;
  if (door.position.y < open) door.position.y = Math.min(open, door.position.y + dt * 1.5);
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (controls.isLocked) {
    updateMovement(dt);
    updateTargeting();
    updateDoor(dt);
    // hum swells as you near the mine glow
    const d = player.position.distanceTo(mineGlow.position);
    sfx.setHum(THREE.MathUtils.clamp(1 - d / 200, 0.04, 0.5) * 0.6);
  }
  // drifting dust, kept centred around the player so it's always visible
  const da = dust.arr;
  for (let i = 0; i < da.length; i += 3) {
    da[i] += dt * 0.4; da[i + 1] += dt * 0.15;
    if (da[i + 1] > 16) da[i + 1] = 0;
    if (da[i] - player.position.x > 40) da[i] -= 80;
    if (da[i] - player.position.x < -40) da[i] += 80;
  }
  dust.points.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
updateObjective();
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
