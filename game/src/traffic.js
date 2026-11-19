// Civilian traffic: cars that follow the road loops of each island,
// cross the causeways, keep their distance and honk when blocked.

import { makeRng } from "./rng.js";
import { WORLD_SEED } from "./world.js";

export const LOOPS = [
  // Isla Grande ring.
  [[900, 1500], [2050, 1500], [2050, 2400], [900, 2400]],
  // Fortuna Strip straight, back and forth through the grid.
  [[560, 1950], [1450, 1950], [1450, 1500], [2340, 1500], [2340, 1950], [1450, 1950], [1450, 2400], [560, 2400]],
  // Cayo Norte loop.
  [[3080, 880], [4220, 880], [3650, 880], [3650, 480], [3650, 1280]],
  // Isla Fortuna loop.
  [[3180, 2750], [4320, 2750], [3750, 2750], [3750, 3180], [3750, 2340]],
  // Causeway run: Grande to Norte and back.
  [[2050, 1500], [2350, 1650], [3050, 1080], [3650, 880], [3050, 1080], [2350, 1650], [1450, 1500]],
  // Causeway run: Grande to Fortuna and back.
  [[1450, 2400], [2250, 2350], [3150, 2620], [3750, 2750], [3150, 2620], [2250, 2350], [1450, 1950]],
];

const COLORS = ["#cfd4de", "#7fa6c9", "#c9b458", "#9dc98a", "#c98ab0", "#8a93a8", "#d98f4e"];

export function spawnTraffic() {
  const rng = makeRng(WORLD_SEED + 31);
  const cars = [];
  for (let i = 0; i < 17; i++) {
    const loop = LOOPS[i % LOOPS.length];
    const seg = rng.int(0, loop.length - 1);
    const a = loop[seg];
    const b = loop[(seg + 1) % loop.length];
    const t = rng.next();
    cars.push({
      id: 1000 + i, kind: "car", traffic: true,
      name: "Traffic car", color: COLORS[i % COLORS.length],
      x: a[0] + (b[0] - a[0]) * t,
      y: a[1] + (b[1] - a[1]) * t,
      angle: Math.atan2(b[1] - a[1], b[0] - a[0]),
      speed: 0, steer: 0, w: 40, h: 20, hp: 100, wrecked: false, driver: "traffic",
      loop, wp: (seg + 1) % loop.length, honkT: rng.range(3, 12), waitT: 0,
    });
  }
  return cars;
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    if (car.wrecked) continue;
    const target = car.loop[car.wp];
    const dx = target[0] - car.x;
    const dy = target[1] - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 46) {
      car.wp = (car.wp + 1) % car.loop.length;
      continue;
    }
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    // Keep distance from anything solid ahead.
    let blocked = false;
    const aheadX = car.x + Math.cos(car.angle) * 58;
    const aheadY = car.y + Math.sin(car.angle) * 58;
    for (const other of G.allVehicles()) {
      if (other === car) continue;
      if (Math.hypot(other.x - aheadX, other.y - aheadY) < 30) blocked = true;
    }
    const p = G.player;
    if (!p.inVehicle && Math.hypot(p.x - aheadX, p.y - aheadY) < 26) blocked = true;
    const cruise = G.weather.rain > 0.5 ? 82 : 108;
    const goal = blocked ? 0 : cruise;
    car.speed += (goal - car.speed) * Math.min(1, dt * 2.2);
    if (blocked) {
      car.honkT -= dt;
      if (car.honkT <= 0) {
        car.honkT = 2.5 + Math.random() * 3;
        if (Math.hypot(p.x - car.x, p.y - car.y) < 420) G.sound.honk();
      }
    }
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
  }
}
