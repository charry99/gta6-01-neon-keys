// The Marisol Keys Patrol: wanted stars, patrol cars and boats,
// foot officers, and the helicopter that joins at four stars.

import { isLand, isWater } from "./world.js";
import { damagePlayer } from "./player.js";
import { scarePeds } from "./pedestrians.js";

export function createPolice() {
  return {
    heat: 0, stars: 0, seen: false, seenT: 0, hideT: 0,
    bustedMeter: 0, units: [], heli: null, spawnT: 0, lastCrime: "",
    addCrime(G, amount, label) {
      if (G.state !== "play") return;
      const seenByPatrol = this.nearPatrol(G, 520) || this.stars > 0;
      this.heat += seenByPatrol ? amount : amount * 0.45;
      this.lastCrime = label || this.lastCrime;
      this.stars = Math.max(this.stars, Math.min(5, Math.floor(this.heat)));
      if (label) G.logEvent("Crime: " + label);
    },
    nearPatrol(G, dist) {
      const p = G.player;
      for (const u of this.units) if (Math.hypot(u.x - p.x, u.y - p.y) < dist) return true;
      for (const t of G.traffic) if (Math.hypot(t.x - p.x, t.y - p.y) < dist * 0.5) return false;
      return false;
    },
    clear(G, paid) {
      this.heat = 0;
      this.stars = 0;
      this.hideT = 0;
      this.bustedMeter = 0;
      for (const u of this.units) u.giveUp = true;
      if (paid) G.notify("You lay low. The patrol loses your trail.");
    },
  };
}

function spawnUnit(G, kind) {
  const p = G.player;
  const pol = G.police;
  const angle = Math.random() * Math.PI * 2;
  const dist = 620 + Math.random() * 160;
  let x = p.x + Math.cos(angle) * dist;
  let y = p.y + Math.sin(angle) * dist;
  if (kind === "boat") {
    // Boats approach over open water.
    for (let i = 0; i < 12 && isLand(x, y); i++) { x += Math.cos(angle) * 90; y += Math.sin(angle) * 90; }
    if (isLand(x, y)) return;
    pol.units.push({ kind, x, y, angle: 0, speed: 0, w: 46, h: 19, hp: 120, color: "#dfe8ff", wake: [] });
  } else if (kind === "car") {
    if (!isLand(x, y)) { x = p.x + Math.cos(angle) * 300; y = p.y + Math.sin(angle) * 300; }
    if (!isLand(x, y)) return;
    pol.units.push({ kind, x, y, angle: 0, speed: 0, w: 42, h: 21, hp: 120, color: "#eef2ff", siren: Math.random() * 6 });
  } else {
    if (!isLand(x, y)) return;
    pol.units.push({ kind, x, y, angle: 0, speed: 0, hp: 40, shootT: 1 + Math.random() });
  }
}

export function updatePolice(G, dt) {
  const pol = G.police;
  const p = G.player;
  pol.stars = Math.min(5, Math.floor(pol.heat));
  // How many units the stars call for.
  const wantCars = pol.stars >= 1 ? Math.min(1 + pol.stars, 5) : 0;
  const wantBoats = pol.stars >= 2 && isWater(p.x, p.y) ? Math.min(pol.stars - 1, 3) : (pol.stars >= 3 ? 1 : 0);
  const wantFoot = pol.stars >= 2 ? Math.min(pol.stars - 1, 3) : 0;
  const count = (k) => pol.units.filter((u) => u.kind === k && !u.giveUp).length;
  pol.spawnT -= dt;
  if (pol.spawnT <= 0) {
    pol.spawnT = 1.6;
    if (count("car") < wantCars) spawnUnit(G, "car");
    else if (count("boat") < wantBoats) spawnUnit(G, "boat");
    else if (count("foot") < wantFoot) spawnUnit(G, "foot");
  }
  // The helicopter arrives at four stars and its light never blinks.
  if (pol.stars >= 4 && !pol.heli) {
    pol.heli = { x: p.x - 500, y: p.y - 380, angle: 0, rotor: 0 };
    G.notify("Patrol helicopter overhead. Its spotlight is on you.");
    G.sound.heliStart();
  }
  if (pol.stars < 4 && pol.heli) { pol.heli = null; G.sound.heliStop(); }
  if (pol.heli) {
    const h = pol.heli;
    h.rotor += dt * 31;
    const tx = p.x + Math.cos(G.time * 0.7) * 60;
    const ty = p.y + Math.sin(G.time * 0.9) * 46;
    h.x += (tx - h.x) * Math.min(1, dt * 1.6);
    h.y += (ty - h.y) * Math.min(1, dt * 1.6);
    h.angle = Math.atan2(p.y - h.y, p.x - h.x);
  }
  // Being seen: any unit with a clear short line to the player.
  let seen = false;
  for (const u of pol.units) {
    const d = Math.hypot(u.x - p.x, u.y - p.y);
    if (d < 330) seen = true;
  }
  if (pol.heli) seen = true;
  pol.seen = seen;
  if (seen) {
    pol.seenT += dt;
    pol.hideT = 0;
  } else if (pol.stars > 0) {
    pol.hideT += dt;
    const coolTime = 7 + pol.stars * 2.5;
    if (pol.hideT > coolTime) {
      pol.heat = Math.max(0, pol.heat - dt * 0.55);
      if (pol.heat < 0.4) { pol.heat = 0; G.notify("You broke line of sight. The heat cools off."); }
    }
  }
  // Units chase, ram, shoot and arrest.
  let arresting = false;
  for (const u of pol.units) {
    if (u.giveUp) { u.speed = Math.max(0, (u.speed || 0) - 60 * dt); continue; }
    const dx = p.x - u.x;
    const dy = p.y - u.y;
    const d = Math.hypot(dx, dy) || 1;
    const want = Math.atan2(dy, dx);
    let diff = want - u.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (u.kind === "car") {
      u.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
      const top = p.inVehicle ? 318 : 210;
      const goal = d > 42 ? top : 0;
      u.speed += (goal - (u.speed || 0)) * Math.min(1, dt * 1.8);
      u.x += Math.cos(u.angle) * u.speed * dt;
      u.y += Math.sin(u.angle) * u.speed * dt;
      if (!isLand(u.x, u.y)) { u.x -= Math.cos(u.angle) * u.speed * dt; u.y -= Math.sin(u.angle) * u.speed * dt; u.speed *= 0.3; }
      if (d < 40 && !p.inVehicle) arresting = true;
      if (d < 34 && p.inVehicle && Math.abs(u.speed) > 60) { p.inVehicle.hp -= 6 * dt * 10; }
    } else if (u.kind === "boat") {
      u.angle += Math.max(-1.8 * dt, Math.min(1.8 * dt, diff));
      const goal = d > 55 ? 330 : 40;
      u.speed += (goal - (u.speed || 0)) * Math.min(1, dt * 1.4);
      u.x += Math.cos(u.angle) * u.speed * dt;
      u.y += Math.sin(u.angle) * u.speed * dt;
      if (isLand(u.x, u.y)) { u.x -= Math.cos(u.angle) * u.speed * dt; u.y -= Math.sin(u.angle) * u.speed * dt; u.speed *= 0.3; }
      u.wake = u.wake || [];
      u.wake.push({ x: u.x, y: u.y, life: 1 });
      if (u.wake.length > 40) u.wake.shift();
      for (const w of u.wake) w.life -= dt * 0.8;
      if (d < 60 && p.inVehicle && p.inVehicle.kind === "boat") arresting = true;
    } else {
      // Foot officer: closes in, then fires warning shots that can hit.
      const sp = d > 130 ? 118 : 62;
      u.x += Math.cos(want) * sp * dt;
      u.y += Math.sin(want) * sp * dt;
      u.angle = want;
      if (d < 30) arresting = true;
      u.shootT -= dt;
      if (u.shootT <= 0 && d < 240 && pol.stars >= 3) {
        u.shootT = 1.4 + Math.random() * 1.4;
        G.sound.shot(false);
        if (Math.random() < 0.42) damagePlayer(G, 6);
        scarePeds(G, u.x, u.y, 200);
      }
    }
    u.siren = (u.siren || 0) + dt * 6;
  }
  // Despawn far-away units so the patrol can re-form near the player.
  pol.units = pol.units.filter((u) => Math.hypot(u.x - p.x, u.y - p.y) < 1500);
  // Arrest: stay pinned and the meter fills. Break away and it drains.
  if (arresting && Math.abs(p.inVehicle ? p.inVehicle.speed : 0) < 26) {
    pol.bustedMeter += dt * 0.42;
    if (pol.bustedMeter >= 1) {
      G.state = "busted";
      G.sound.stopAll();
    }
  } else {
    pol.bustedMeter = Math.max(0, pol.bustedMeter - dt * 0.3);
  }
  if (pol.stars > 0 && Math.random() < dt * 0.4) G.sound.siren(pol.stars);
}
