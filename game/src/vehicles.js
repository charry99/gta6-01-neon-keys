// Cars and boats: spawning, stealing, driving physics, wakes and wrecks.

import { makeRng } from "./rng.js";
import { buildingHit, isLand, isWater, WORLD_SEED } from "./world.js";
import { damagePlayer } from "./player.js";

const CAR_COLORS = ["#e8e4da", "#c23b4e", "#3b78c2", "#e8b93b", "#59c26a", "#8a5fc0", "#e87f2e", "#d9d9e8", "#2ec8c0", "#565f73"];
const CAR_NAMES = ["Brisa Coupe", "Palma Sedan", "Mire Pickup", "Strip Roadster", "Port Van", "Norte Hatch", "Casino GT", "Taxi Cab"];
const BOAT_NAMES = ["Key Runner", "Mire Skiff", "Fortuna Racer"];

let nextId = 1;

function makeCar(rng, x, y, angle, opts = {}) {
  return {
    id: nextId++, kind: "car",
    name: opts.name || rng.pick(CAR_NAMES),
    x, y, angle, speed: 0, steer: 0,
    w: 40, h: 20, color: opts.color || rng.pick(CAR_COLORS),
    hp: 100, wrecked: false, driver: null, targetCar: !!opts.targetCar,
    honkT: rng.range(2, 9),
  };
}

function makeBoat(rng, x, y, angle) {
  return {
    id: nextId++, kind: "boat",
    name: rng.pick(BOAT_NAMES),
    x, y, angle, speed: 0, steer: 0,
    w: 44, h: 18, color: rng.pick(["#e8e4da", "#22d8e8", "#ff4fa3", "#ffd34d"]),
    hp: 100, wrecked: false, driver: null, wake: [],
  };
}

export function spawnVehicles(world) {
  const rng = makeRng(WORLD_SEED + 77);
  const list = [];
  // Parked and waiting cars along the street roads of all three islands.
  // (The last roads in the list are the causeways: no parking on a bridge.)
  for (const road of world.roads.slice(0, 10)) {
    const n = rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const t = rng.range(0.06, 0.94);
      const x = road.x1 + (road.x2 - road.x1) * t;
      const y = road.y1 + (road.y2 - road.y1) * t;
      const side = rng.chance(0.5) ? 34 : -34;
      const px = x + side * 0.4;
      const py = y + side;
      if (!isLand(px, py)) continue;
      if (buildingHit(world.buildings, px, py, 22)) continue;
      list.push(makeCar(rng, px, py, rng.range(0, Math.PI * 2)));
    }
  }
  // Speedboats tied up at the three marinas and the docks.
  const boatSpots = [
    [330, 2050], [300, 1900], [380, 2200],
    [2700, 1050], [2850, 950],
    [2880, 2960], [2950, 2750], [2650, 1900],
  ];
  for (const [x, y] of boatSpots) list.push(makeBoat(rng, x, y, rng.range(0, Math.PI * 2)));
  return list;
}

export function nearestVehicle(G, x, y, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const v of G.vehicles) {
    if (v.wrecked || v.driver) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

export function enterVehicle(G, v) {
  const p = G.player;
  p.inVehicle = v;
  v.driver = "player";
  G.sound.engineStart();
  if (v.kind === "car" && !v.playerStole) {
    v.playerStole = true;
    G.police.addCrime(G, 1, "Stole a " + v.name);
    G.notify("Stole the " + v.name + ". The Keys are watching.");
  }
  if (v.kind === "boat" && !v.playerStole) {
    v.playerStole = true;
    G.police.addCrime(G, 1, "Stole a " + v.name);
  }
}

export function exitVehicle(G) {
  const p = G.player;
  const v = p.inVehicle;
  if (!v) return;
  v.driver = null;
  p.inVehicle = null;
  // Step out beside the vehicle, onto land if there is any.
  const spots = [
    [v.x + Math.cos(v.angle + Math.PI / 2) * 30, v.y + Math.sin(v.angle + Math.PI / 2) * 30],
    [v.x - Math.cos(v.angle + Math.PI / 2) * 30, v.y - Math.sin(v.angle + Math.PI / 2) * 30],
    [v.x, v.y + 34], [v.x, v.y - 34],
  ];
  for (const [sx, sy] of spots) {
    if (v.kind === "boat" || isLand(sx, sy)) { p.x = sx; p.y = sy; break; }
  }
  G.sound.engineStop();
}

export function driveVehicle(G, v, dt, controls) {
  const rain = G.weather.rain;
  if (v.kind === "car") {
    const accel = controls.up ? 260 : 0;
    const brake = controls.down ? (v.speed > 4 ? -340 : -120) : 0;
    v.speed += (accel + brake) * dt;
    const drag = controls.handbrake ? 1.6 : 0.55;
    v.speed -= v.speed * drag * dt;
    const maxF = 335;
    const maxR = -95;
    v.speed = Math.max(maxR, Math.min(maxF, v.speed));
    const grip = rain > 0.5 ? 0.72 : 1;
    const steerTarget = (controls.left ? -1 : 0) + (controls.right ? 1 : 0);
    v.steer += (steerTarget - v.steer) * Math.min(1, dt * 8);
    if (Math.abs(v.speed) > 2) {
      v.angle += v.steer * 1.9 * grip * dt * Math.sign(v.speed) * Math.min(1, Math.abs(v.speed) / 120);
    }
    const nx = v.x + Math.cos(v.angle) * v.speed * dt;
    const ny = v.y + Math.sin(v.angle) * v.speed * dt;
    moveCar(G, v, nx, ny, dt);
  } else {
    const accel = controls.up ? 210 : 0;
    const brake = controls.down ? -150 : 0;
    v.speed += (accel + brake) * dt;
    v.speed -= v.speed * 0.35 * dt;
    v.speed = Math.max(-70, Math.min(390, v.speed));
    const steerTarget = (controls.left ? -1 : 0) + (controls.right ? 1 : 0);
    v.steer += (steerTarget - v.steer) * Math.min(1, dt * 5);
    if (Math.abs(v.speed) > 2) v.angle += v.steer * 1.15 * dt * Math.sign(v.speed);
    // Boats drift: velocity keeps some of the old heading.
    const drift = 0.86;
    v.dvx = (v.dvx || 0) * drift + Math.cos(v.angle) * v.speed * (1 - drift);
    v.dvy = (v.dvy || 0) * drift + Math.sin(v.angle) * v.speed * (1 - drift);
    const nx = v.x + v.dvx * dt;
    const ny = v.y + v.dvy * dt;
    if (isWater(nx, ny) || G.world.bridges.some((b) => Math.hypot(nx - b.x1, ny - b.y1) < 4)) {
      v.x = nx; v.y = ny;
    } else if (isWater(nx, v.y)) {
      v.x = nx; v.speed *= 0.6;
    } else if (isWater(v.x, ny)) {
      v.y = ny; v.speed *= 0.6;
    } else {
      v.speed *= 0.4;
    }
    const sternX = v.x - Math.cos(v.angle) * 24;
    const sternY = v.y - Math.sin(v.angle) * 24;
    const lastWake = v.wake[v.wake.length - 1];
    if (!lastWake || Math.hypot(lastWake.x - sternX, lastWake.y - sternY) > 16) {
      v.wake.push({ x: sternX, y: sternY, life: 1 });
    }
    if (v.wake.length > 60) v.wake.shift();
  }
  for (const w of v.wake || []) w.life -= dt * 0.7;
  if (v.wake) v.wake = v.wake.filter((w) => w.life > 0);
}

function moveCar(G, v, nx, ny, dt) {
  const hit = buildingHit(G.world.buildings, nx, ny, 17);
  if (hit) {
    if (Math.abs(v.speed) > 120) {
      v.hp -= 16;
      G.sound.crash();
      if (v.driver === "player") damagePlayer(G, 5);
      // One crash is one crime, however long the scrape lasts.
      if (G.time - (v.crashT || 0) > 2.5) {
        v.crashT = G.time;
        G.police.addCrime(G, 0.3, "Crashed into a building");
      }
    }
    v.speed *= -0.25;
    return;
  }
  // Traffic and parked metal are solid too.
  for (const other of G.allVehicles()) {
    if (other === v) continue;
    if (Math.hypot(other.x - nx, other.y - ny) < 30) {
      if (Math.abs(v.speed) > 110) {
        v.hp -= 10;
        other.hp -= 10;
        G.sound.crash();
        if (G.time - (v.crashT || 0) > 2.5) {
          v.crashT = G.time;
          G.police.addCrime(G, 0.4, "Hit another vehicle");
        }
      }
      v.speed *= 0.3;
      return;
    }
  }
  v.x = nx; v.y = ny;
  // A car in the sea is a wreck, and its driver swims for it.
  if (isWater(v.x, v.y)) {
    v.wrecked = true;
    v.speed = 0;
    if (v.driver === "player") {
      G.player.inVehicle = null;
      v.driver = null;
      G.player.x = v.x; G.player.y = v.y;
      G.notify("The car is wrecked in the water. Swim to shore.");
      G.sound.engineStop();
    }
  }
  if (v.hp <= 0 && !v.wrecked) {
    v.wrecked = true;
    v.speed = 0;
    if (v.driver === "player") exitVehicle(G);
    G.notify("Vehicle wrecked.");
  }
}

export function updatePlayerVehicle(G, dt) {
  const v = G.player.inVehicle;
  if (!v) return;
  const k = G.input.keys;
  const controls = {
    up: k.has("KeyW") || k.has("ArrowUp"),
    down: k.has("KeyS") || k.has("ArrowDown"),
    left: k.has("KeyA") || k.has("ArrowLeft"),
    right: k.has("KeyD") || k.has("ArrowRight"),
    handbrake: k.has("Space"),
  };
  if (G.autopilot) Object.assign(controls, G.autopilot.controls || {});
  driveVehicle(G, v, dt, controls);
  G.player.x = v.x;
  G.player.y = v.y;
  G.player.angle = v.angle;
  G.sound.engineUpdate(Math.abs(v.speed) / 340, v.kind);
}
