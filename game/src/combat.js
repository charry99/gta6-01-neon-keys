// Combat: Vera's pistol, rival-crew guards, bullets and pickups.

import { buildingHit, isLand } from "./world.js";
import { damagePlayer } from "./player.js";
import { scarePeds } from "./pedestrians.js";

export function createCombat() {
  return { bullets: [], enemies: [], pickups: [], shootCd: 0, muzzle: 0 };
}

export function spawnGuards(G, spots) {
  for (const [x, y] of spots) {
    G.combat.enemies.push({ x, y, angle: 0, hp: 34, shootT: 1 + Math.random() * 2, guardX: x, guardY: y, alert: false });
  }
}

export function spawnPickup(G, kind, x, y) {
  G.combat.pickups.push({ kind, x, y, bob: Math.random() * 6 });
}

export function seedPickups(G) {
  const spots = [
    ["health", 1000, 1620], ["ammo", 1620, 1900], ["armor", 2100, 2320],
    ["health", 3600, 960], ["ammo", 3820, 2680], ["cash", 1480, 2080],
    ["ammo", 700, 2300], ["health", 3980, 820], ["cash", 3300, 2900],
  ];
  for (const [kind, x, y] of spots) if (isLand(x, y)) spawnPickup(G, kind, x, y);
}

export function tryShoot(G) {
  const p = G.player;
  const c = G.combat;
  if (p.inVehicle || !p.hasGun || c.shootCd > 0) return;
  if (p.ammo <= 0) {
    G.notify("Out of ammo. The Night Market sells more.");
    c.shootCd = 0.35;
    return;
  }
  p.ammo--;
  c.shootCd = 0.24;
  c.muzzle = 0.06;
  const spread = (Math.random() - 0.5) * 0.05;
  c.bullets.push({
    x: p.x + Math.cos(p.aim) * 16, y: p.y + Math.sin(p.aim) * 16,
    vx: Math.cos(p.aim + spread) * 880, vy: Math.sin(p.aim + spread) * 880,
    life: 0.55, from: "player",
  });
  G.sound.shot(true);
  scarePeds(G, p.x, p.y, 260);
  G.police.addCrime(G, 0.8, "Shots fired");
}

export function fistAttack(G) {
  const p = G.player;
  if (p.inVehicle) return;
  for (const e of G.combat.enemies) {
    if (Math.hypot(e.x - p.x, e.y - p.y) < 42) {
      e.hp -= 12;
      e.alert = true;
      G.sound.thud();
      if (e.hp <= 0) killEnemy(G, e);
    }
  }
  for (const ped of G.pedestrians) {
    if (!ped.down && Math.hypot(ped.x - p.x, ped.y - p.y) < 36) {
      ped.fleeT = 3;
      G.police.addCrime(G, 0.7, "Attacked a pedestrian");
    }
  }
}

function killEnemy(G, e) {
  e.dead = true;
  G.player.cash += 25;
  spawnPickup(G, Math.random() < 0.5 ? "ammo" : "cash", e.x, e.y);
  G.notify("Rival guard down. +$25");
  G.police.addCrime(G, 0.6, "A guard went down");
}

export function updateCombat(G, dt) {
  const c = G.combat;
  const p = G.player;
  c.shootCd = Math.max(0, c.shootCd - dt);
  c.muzzle = Math.max(0, c.muzzle - dt);
  if (G.input.mouseDown) tryShoot(G);
  // Bullets fly and land.
  for (const b of c.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (buildingHit(G.world.buildings, b.x, b.y, 2)) b.life = 0;
    if (b.from === "player") {
      for (const e of c.enemies) {
        if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 13) {
          e.hp -= 17;
          e.alert = true;
          b.life = 0;
          if (e.hp <= 0) killEnemy(G, e);
          break;
        }
      }
      for (const u of G.police.units) {
        if (Math.hypot(u.x - b.x, u.y - b.y) < 16) {
          u.hp -= 17;
          b.life = 0;
          G.police.addCrime(G, 1, "Shot at the patrol");
          if (u.hp <= 0) u.giveUp = true;
          break;
        }
      }
    } else if (Math.hypot(p.x - b.x, p.y - b.y) < 12 && !p.inVehicle) {
      damagePlayer(G, 7);
      b.life = 0;
    }
  }
  c.bullets = c.bullets.filter((b) => b.life > 0);
  // Guards hold their post until Vera comes close, then they open fire.
  for (const e of c.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    if (d < 300) e.alert = true;
    if (e.alert) {
      e.angle = Math.atan2(p.y - e.y, p.x - e.x);
      if (d > 120) { e.x += Math.cos(e.angle) * 52 * dt; e.y += Math.sin(e.angle) * 52 * dt; }
      e.shootT -= dt;
      if (e.shootT <= 0 && d < 280) {
        e.shootT = 1.1 + Math.random() * 1.3;
        c.bullets.push({
          x: e.x, y: e.y,
          vx: Math.cos(e.angle) * 720, vy: Math.sin(e.angle) * 720,
          life: 0.5, from: "enemy",
        });
        G.sound.shot(false);
      }
    }
  }
  c.enemies = c.enemies.filter((e) => !e.dead || Math.random() < 0.5);
  c.enemies = c.enemies.filter((e) => !e.dead);
  // Pickups.
  for (const pk of c.pickups) {
    pk.bob += dt * 3;
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 26) {
      pk.taken = true;
      G.sound.pickup();
      if (pk.kind === "health") { p.hp = Math.min(p.maxHp, p.hp + 35); G.notify("+35 health"); }
      if (pk.kind === "armor") { p.armor = Math.min(100, p.armor + 50); G.notify("+50 armour"); }
      if (pk.kind === "ammo") { p.ammo += 12; G.notify("+12 pistol rounds"); }
      if (pk.kind === "cash") { p.cash += 40; G.notify("+$40 found cash"); }
    }
  }
  c.pickups = c.pickups.filter((pk) => !pk.taken);
}
