// Pedestrians of the Keys: they stroll the sidewalks and the boardwalk,
// and they run when the night turns violent near them.

import { makeRng } from "./rng.js";
import { collideBuildings, isLand, WORLD_SEED } from "./world.js";

const SHIRTS = ["#ff8fb5", "#8fd8ff", "#ffe28a", "#b5ffcb", "#d3b5ff", "#ffb08a", "#f2f2f2", "#8affde"];

export function spawnPedestrians(world) {
  const rng = makeRng(WORLD_SEED + 53);
  const peds = [];
  for (let i = 0; i < 46; i++) {
    const road = world.roads[rng.int(0, 11)];
    const t = rng.range(0.05, 0.95);
    const side = rng.chance(0.5) ? 30 : -30;
    const x = road.x1 + (road.x2 - road.x1) * t + rng.range(-8, 8);
    const y = road.y1 + (road.y2 - road.y1) * t + side;
    if (!isLand(x, y)) continue;
    peds.push({
      x, y, angle: rng.range(0, Math.PI * 2),
      speed: rng.range(26, 44), color: rng.pick(SHIRTS),
      wanderT: rng.range(1, 5), fleeT: 0, panic: false, down: false,
      phase: rng.range(0, 6),
    });
  }
  return peds;
}

export function scarePeds(G, x, y, radius) {
  for (const ped of G.pedestrians) {
    if (ped.down) continue;
    if (Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.fleeT = 2.6;
      ped.angle = Math.atan2(ped.y - y, ped.x - x);
    }
  }
}

export function updatePedestrians(G, dt) {
  const p = G.player;
  for (const ped of G.pedestrians) {
    if (ped.down) continue;
    ped.phase += dt * 7;
    // A fast car or a drawn gun nearby is reason enough to run.
    const threat = (p.inVehicle && Math.abs(p.inVehicle.speed) > 150 && Math.hypot(p.x - ped.x, p.y - ped.y) < 120)
      || (G.police.stars >= 3 && Math.hypot(p.x - ped.x, p.y - ped.y) < 150);
    if (threat) ped.fleeT = Math.max(ped.fleeT, 0.6);
    let speed = ped.speed;
    if (ped.fleeT > 0) {
      ped.fleeT -= dt;
      speed = 128;
      ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
    } else {
      ped.wanderT -= dt;
      if (ped.wanderT <= 0) {
        ped.wanderT = 2 + Math.random() * 4;
        ped.angle += (Math.random() - 0.5) * 1.8;
      }
    }
    let nx = ped.x + Math.cos(ped.angle) * speed * dt;
    let ny = ped.y + Math.sin(ped.angle) * speed * dt;
    if (!isLand(nx, ny)) {
      ped.angle += Math.PI * 0.9;
      continue;
    }
    const fixed = collideBuildings(G.world.buildings, nx, ny, 9);
    nx = fixed.x; ny = fixed.y;
    ped.x = nx; ped.y = ny;
    // Stepped in front of a moving car: a crime the Keys remember.
    for (const v of G.allVehicles()) {
      if (Math.abs(v.speed) > 40 && Math.hypot(v.x - ped.x, v.y - ped.y) < 20) {
        ped.down = true;
        if (v.driver === "player" || v === p.inVehicle) {
          G.police.addCrime(G, 1.2, "Hit a pedestrian");
          G.sound.thud();
        }
        break;
      }
    }
  }
}
