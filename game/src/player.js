// Vera Solano on foot: walking, sprinting, swimming and taking damage.

import { collideBuildings, isWater } from "./world.js";

export function createPlayer(x, y) {
  return {
    x, y, vx: 0, vy: 0, angle: 0, aim: 0,
    hp: 100, maxHp: 100, armor: 0,
    cash: 120, ammo: 24, hasGun: true,
    inVehicle: null, swimming: false, swimDrain: 0,
    dead: false, walkCycle: 0,
  };
}

export function damagePlayer(G, amount) {
  const p = G.player;
  if (p.dead || G.state !== "play") return;
  let left = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, left * 0.6);
    p.armor -= absorbed;
    left -= absorbed;
  }
  p.hp -= left;
  G.flashRed = Math.min(0.55, G.flashRed + 0.25);
  if (p.hp <= 0) {
    p.hp = 0;
    p.dead = true;
    G.state = "wasted";
    G.sound.stopAll();
  }
}

export function healPlayer(G, amount) {
  const p = G.player;
  p.hp = Math.min(p.maxHp, p.hp + amount);
}

export function updatePlayer(G, dt) {
  const p = G.player;
  if (p.inVehicle || p.dead) return;
  const input = G.input;
  let mx = 0;
  let my = 0;
  if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) my -= 1;
  if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) my += 1;
  if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) mx -= 1;
  if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) mx += 1;
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    p.angle = Math.atan2(my, mx);
  }
  p.swimming = isWater(p.x, p.y);
  const sprint = input.keys.has("ShiftLeft") || input.keys.has("ShiftRight");
  let speed = p.swimming ? 62 : sprint ? 235 : 148;
  if (G.weather.rain > 0.6 && !p.swimming) speed *= 0.94;
  p.vx = mx * speed;
  p.vy = my * speed;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (!p.swimming) {
    const fixed = collideBuildings(G.world.buildings, p.x, p.y, 11);
    p.x = fixed.x; p.y = fixed.y;
  }
  p.x = Math.max(10, Math.min(5190, p.x));
  p.y = Math.max(10, Math.min(3790, p.y));
  if (moving) p.walkCycle += dt * (p.swimming ? 5 : 9);
  // Cold black water hurts. Get to a dock, a beach or a boat.
  if (p.swimming) {
    p.swimDrain += dt;
    if (p.swimDrain > 2.2) {
      p.swimDrain = 0;
      damagePlayer(G, 4);
      G.notify("The water is freezing. Find land or a boat.");
    }
  } else {
    p.swimDrain = 0;
  }
  // Aim follows the mouse in world space.
  const cam = G.camera;
  p.aim = Math.atan2(input.mouseY + cam.y - p.y, input.mouseX + cam.x - p.x);
}
