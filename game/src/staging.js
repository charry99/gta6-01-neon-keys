// Staging for screenshots: a query parameter jumps the game into a
// named scene and a simple deterministic autopilot plays it forward
// from the fixed seed, so every screenshot is a real render of play.

import { LOOPS } from "./traffic.js";
import { onBridge } from "./world.js";

export const SCENES = ["cover", "chase", "mission", "boat"];

export function sceneFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const scene = params.get("scene");
    if (scene && SCENES.includes(scene)) return scene;
  } catch (err) { /* no query string */ }
  return null;
}

function putPlayerInCar(G, x, y, angle) {
  let best = null;
  let bd = Infinity;
  for (const v of G.vehicles) {
    if (v.kind !== "car" || v.driver) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bd) { bd = d; best = v; }
  }
  if (!best) return null;
  best.x = x; best.y = y; best.angle = angle; best.speed = 120;
  best.playerStole = true;
  G.player.inVehicle = best;
  best.driver = "player";
  G.player.x = x; G.player.y = y;
  return best;
}

function putPlayerInBoat(G, x, y, angle) {
  let best = null;
  let bd = Infinity;
  for (const v of G.vehicles) {
    if (v.kind !== "boat" || v.driver) continue;
    const d = Math.hypot(v.x - x, v.y - y);
    if (d < bd) { bd = d; best = v; }
  }
  if (!best) return null;
  best.x = x; best.y = y; best.angle = angle; best.speed = 170;
  best.playerStole = true;
  G.player.inVehicle = best;
  best.driver = "player";
  G.player.x = x; G.player.y = y;
  return best;
}

export function applyScene(G, scene) {
  G.scene = scene;
  G.weather.forced = null;
  if (scene === "cover") {
    // Night drive on the Brisa Causeway toward the Fortuna Strip.
    G.clock = 22.4;
    // Keep the causeway run clear of through traffic for the cover drive:
    // the two causeway loops sit this scene out, city traffic stays.
    G.traffic = G.traffic.filter((car) => car.loop !== LOOPS[4] && car.loop !== LOOPS[5]);
    // And nobody is strolling the causeway decks during the cover drive.
    G.pedestrians = G.pedestrians.filter((ped) => !onBridge(ped.x, ped.y));
    putPlayerInCar(G, 2470, 1585, -0.68);
    G.autopilot = { waypoints: [[3050, 1080], [3650, 880]], wp: 0, speed: 0.62 };
    G.camera.x = G.player.x - 640;
    G.camera.y = G.player.y - 400;
  } else if (scene === "chase") {
    // Four stars on the Fortuna Causeway bridge, patrol all around.
    G.clock = 23.2;
    const car = putPlayerInCar(G, 2680, 2485, 0.32);
    if (car) car.speed = 210;
    G.police.heat = 4.4;
    G.police.stars = 4;
    // Patrol cars staged close behind, boats on the water below.
    const spots = [[2560, 2430, "car"], [2790, 2560, "car"], [2500, 2520, "car"]];
    for (const [x, y] of spots) G.police.units.push({ kind: "car", x, y, angle: 0.3, speed: 180, w: 42, h: 21, hp: 120, color: "#eef2ff", siren: x });
    G.police.units.push({ kind: "boat", x: 2620, y: 2760, angle: -1.2, speed: 120, w: 46, h: 19, hp: 120, color: "#dfe8ff", wake: [] });
    G.police.units.push({ kind: "boat", x: 2920, y: 2320, angle: 2.4, speed: 120, w: 46, h: 19, hp: 120, color: "#dfe8ff", wake: [] });
    G.police.heli = { x: G.player.x - 160, y: G.player.y - 130, angle: 0.6, rotor: 0 };
    G.autopilot = { waypoints: [[3150, 2620], [3750, 2750]], wp: 0, speed: 1 };
    G.camera.x = G.player.x - 640;
    G.camera.y = G.player.y - 400;
  } else if (scene === "mission") {
    // Smuggling run mid-delivery: cargo aboard, exposure part-filled,
    // a patrol boat in sight on the way to Norte Marina.
    G.clock = 21.1;
    putPlayerInBoat(G, 1750, 1080, -0.15);
    G.missions.side = { kind: "smuggle", stage: "carry", from: { x: 620, y: 1980 }, to: { x: 3080, y: 1010 }, label: "Smuggling run", reward: 260, time: 96 };
    G.missions.exposure = 0.46;
    G.smuggling = true;
    G.police.heat = 1.6;
    G.police.stars = 1;
    G.police.units.push({ kind: "boat", x: 2280, y: 920, angle: -2.6, speed: 90, w: 46, h: 19, hp: 120, color: "#dfe8ff", wake: [] });
    G.autopilot = { waypoints: [[2400, 900], [3000, 1000]], wp: 0, speed: 0.9 };
    G.camera.x = G.player.x - 640;
    G.camera.y = G.player.y - 400;
  } else if (scene === "boat") {
    // Dawn rain run between the islands, marina lights ahead.
    G.clock = 6.6;
    G.weather.forced = 0.85;
    putPlayerInBoat(G, 2250, 3250, 0.75);
    G.autopilot = { waypoints: [[2900, 2950]], wp: 0, speed: 0.85 };
    G.camera.x = G.player.x - 640;
    G.camera.y = G.player.y - 400;
  }
}

// Deterministic autopilot: steer the current vehicle at the next
// waypoint and hold a steady throttle. Used by staged scenes only.
export function updateAutopilot(G, dt) {
  const ap = G.autopilot;
  if (!ap) return;
  const v = G.player.inVehicle;
  if (!v) { ap.controls = {}; return; }
  const target = ap.waypoints[Math.min(ap.wp, ap.waypoints.length - 1)];
  const dx = target[0] - v.x;
  const dy = target[1] - v.y;
  if (Math.hypot(dx, dy) < 90 && ap.wp < ap.waypoints.length - 1) ap.wp++;
  const want = Math.atan2(dy, dx);
  let diff = want - v.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  ap.controls = {
    up: true,
    down: false,
    left: diff < -0.06,
    right: diff > 0.06,
    handbrake: false,
  };
  // Cap the staged speed so scenes stay composed for the camera.
  const cap = v.kind === "boat" ? 250 : 230;
  if (v.speed > cap * (ap.speed || 1)) v.speed = cap * (ap.speed || 1);
}
