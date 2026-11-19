// The Marisol Keys archipelago: three islands joined by causeways.
// Land is the union of three island ellipses and the bridge decks.
// Everything else is open water, and the water is dangerous.

import { makeRng } from "./rng.js";

export const WORLD_W = 5200;
export const WORLD_H = 3800;
export const WORLD_SEED = 20261119;

export const ISLANDS = [
  { name: "Isla Grande", cx: 1450, cy: 1950, rx: 1080, ry: 830 },
  { name: "Cayo Norte", cx: 3650, cy: 880, rx: 790, ry: 540 },
  { name: "Isla Fortuna", cx: 3750, cy: 2750, rx: 760, ry: 560 },
];

export const BRIDGES = [
  { x1: 2350, y1: 1650, x2: 3050, y2: 1080, w: 96, name: "Brisa Causeway" },
  { x1: 2250, y1: 2350, x2: 3150, y2: 2620, w: 96, name: "Fortuna Causeway" },
  { x1: 4150, y1: 1350, x2: 4150, y2: 2250, w: 88, name: "Norte Span" },
];

export function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  return Math.hypot(px - qx, py - qy);
}

export function isLand(x, y) {
  for (const isl of ISLANDS) {
    const nx = (x - isl.cx) / isl.rx;
    const ny = (y - isl.cy) / isl.ry;
    if (nx * nx + ny * ny <= 1) return true;
  }
  for (const b of BRIDGES) {
    if (distToSegment(x, y, b.x1, b.y1, b.x2, b.y2) <= b.w / 2) return true;
  }
  return false;
}

export function isWater(x, y) {
  return !isLand(x, y);
}

export function onBridge(x, y) {
  for (const b of BRIDGES) {
    if (distToSegment(x, y, b.x1, b.y1, b.x2, b.y2) <= b.w / 2) return b;
  }
  return null;
}

function buildRoads() {
  const roads = [];
  const h = (x1, x2, y, name) => roads.push({ x1, y1: y, x2, y2: y, name });
  const v = (x, y1, y2, name) => roads.push({ x1: x, y1, x2: x, y2, name });
  h(520, 2380, 1500, "Avenida Brisa");
  h(520, 2380, 1950, "Fortuna Strip");
  h(520, 2380, 2400, "Calle Palma");
  v(900, 1250, 2650, "Port Road");
  v(1450, 1200, 2700, "Neon Avenue");
  v(2050, 1300, 2600, "Old Town Lane");
  h(3050, 4250, 880, "Mire Road");
  v(3650, 450, 1320, "Parish Way");
  h(3150, 4350, 2750, "Runway Road");
  v(3750, 2300, 3200, "Aero Lane");
  for (const b of BRIDGES) roads.push({ x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, name: b.name });
  return roads;
}

export function distToRoad(x, y, roads) {
  let best = Infinity;
  for (const r of roads) best = Math.min(best, distToSegment(x, y, r.x1, r.y1, r.x2, r.y2));
  return best;
}

const NEON = ["#ff4fa3", "#22d8e8", "#ffd34d", "#7dffb0", "#b98cff", "#ff7a4d", "#4dc9ff", "#ff4d6d"];
const WALL = ["#2b3350", "#333a5e", "#26304d", "#3a2f52", "#243447", "#40365a", "#2e3d55"];

const DISTRICTS = [
  { name: "Port Brisa", x: 800, y: 1450 },
  { name: "Fortuna Strip", x: 1500, y: 1980 },
  { name: "Old Town", x: 2050, y: 2250 },
  { name: "Palm Heights", x: 1150, y: 2500 },
  { name: "The Mire", x: 3650, y: 880 },
  { name: "Aero Key", x: 3750, y: 2750 },
];

export function districtAt(x, y) {
  let best = DISTRICTS[0];
  let bd = Infinity;
  for (const d of DISTRICTS) {
    const dd = Math.hypot(x - d.x, y - d.y);
    if (dd < bd) { bd = dd; best = d; }
  }
  return best.name;
}

export const POIS = [
  { kind: "fixer", name: "Brisa Crew Fixer", x: 980, y: 1560, color: "#ffd34d" },
  { kind: "garage", name: "Lay-Low Garage", x: 1980, y: 1420, color: "#7dffb0" },
  { kind: "shop", name: "Night Market Arms", x: 1560, y: 2040, color: "#ff7a4d" },
  { kind: "chopshop", name: "Mire Chop Shop", x: 3380, y: 760, color: "#b98cff" },
  { kind: "marina", name: "Brisa Marina", x: 620, y: 1980, color: "#22d8e8" },
  { kind: "marina", name: "Norte Marina", x: 3080, y: 1010, color: "#22d8e8" },
  { kind: "marina", name: "Fortuna Marina", x: 3180, y: 2880, color: "#22d8e8" },
  { kind: "safehouse", name: "Palm Heights Safehouse", x: 1120, y: 2560, color: "#4dc9ff", price: 800 },
  { kind: "safehouse", name: "Aero Key Safehouse", x: 3980, y: 2920, color: "#4dc9ff", price: 1200 },
  { kind: "airstrip", name: "Aero Key Strip", x: 3750, y: 2480, color: "#dfe8ff" },
];

export function buildWorld() {
  const rng = makeRng(WORLD_SEED);
  const roads = buildRoads();
  const buildings = [];
  let tries = 0;
  while (buildings.length < 340 && tries < 6000) {
    tries++;
    const isl = ISLANDS[rng.int(0, 2)];
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next()) * 0.88;
    const x = isl.cx + Math.cos(a) * isl.rx * rr;
    const y = isl.cy + Math.sin(a) * isl.ry * rr;
    const w = rng.range(46, 120);
    const h = rng.range(40, 110);
    if (distToRoad(x, y, roads) < 78) continue;
    let overlap = false;
    for (const b of buildings) {
      if (Math.abs(b.x - x) < (b.w + w) / 2 + 14 && Math.abs(b.y - y) < (b.h + h) / 2 + 14) { overlap = true; break; }
    }
    if (overlap) continue;
    let nearPoi = false;
    for (const p of POIS) if (Math.hypot(p.x - x, p.y - y) < 130) { nearPoi = true; break; }
    if (nearPoi) continue;
    buildings.push({
      x, y, w, h,
      wall: rng.pick(WALL),
      neon: rng.pick(NEON),
      floors: rng.int(2, 9),
      district: districtAt(x, y),
      seed: rng.int(1, 99999),
    });
  }
  const trees = [];
  for (let i = 0; i < 260; i++) {
    const isl = ISLANDS[rng.int(0, 2)];
    const a = rng.range(0, Math.PI * 2);
    const rr = Math.sqrt(rng.next()) * 0.95;
    const x = isl.cx + Math.cos(a) * isl.rx * rr;
    const y = isl.cy + Math.sin(a) * isl.ry * rr;
    if (distToRoad(x, y, roads) < 40) continue;
    trees.push({ x, y, r: rng.range(7, 14) });
  }
  return { roads, buildings, trees, pois: POIS, islands: ISLANDS, bridges: BRIDGES };
}

export function collideBuildings(buildings, x, y, r) {
  for (const b of buildings) {
    const hw = b.w / 2 + r;
    const hh = b.h / 2 + r;
    const dx = x - b.x;
    const dy = y - b.y;
    if (Math.abs(dx) < hw && Math.abs(dy) < hh) {
      const pushX = hw - Math.abs(dx);
      const pushY = hh - Math.abs(dy);
      if (pushX < pushY) x = b.x + (dx >= 0 ? hw : -hw);
      else y = b.y + (dy >= 0 ? hh : -hh);
    }
  }
  return { x, y };
}

export function buildingHit(buildings, x, y, r) {
  for (const b of buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + r && Math.abs(y - b.y) < b.h / 2 + r) return b;
  }
  return null;
}
