// Rendering and camera: the night archipelago, wet neon streets,
// headlights, the helicopter spotlight, rain and dawn light.

import { hash2 } from "./rng.js";
import { districtAt, WORLD_H, WORLD_W } from "./world.js";

export function createCamera() {
  return { x: 0, y: 0, w: 1280, h: 800, shake: 0 };
}

export function updateCamera(G, dt) {
  const cam = G.camera;
  const p = G.player;
  const look = p.inVehicle ? Math.min(90, Math.abs(p.inVehicle.speed) * 0.28) : 0;
  const tx = p.x + Math.cos(p.angle) * look - cam.w / 2;
  const ty = p.y + Math.sin(p.angle) * look - cam.h / 2;
  const k = Math.min(1, dt * 4.5);
  cam.x += (tx - cam.x) * k;
  cam.y += (ty - cam.y) * k;
  cam.x = Math.max(-80, Math.min(WORLD_W - cam.w + 80, cam.x));
  cam.y = Math.max(-80, Math.min(WORLD_H - cam.h + 80, cam.y));
  cam.shake = Math.max(0, cam.shake - dt * 2);
}

// Night darkness: 0 at deep night, up to 0.35 of grey dawn light.
export function nightAmount(G) {
  const t = G.clock / 24;
  const dawn = Math.max(0, Math.sin((t - 0.2) * Math.PI * 2)) * 0.4;
  return 1 - dawn;
}

function drawWater(ctx, G, cam) {
  const grad = ctx.createLinearGradient(0, 0, 0, cam.h);
  grad.addColorStop(0, "#06182e");
  grad.addColorStop(1, "#0a2438");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cam.w, cam.h);
  ctx.fillStyle = "rgba(120,200,255,0.10)";
  const step = 90;
  const ox = Math.floor(cam.x / step) * step;
  const oy = Math.floor(cam.y / step) * step;
  for (let x = ox; x < cam.x + cam.w + step; x += step) {
    for (let y = oy; y < cam.y + cam.h + step; y += step) {
      const h = hash2(x, y);
      const wob = Math.sin(G.time * 1.3 + h * 20) * 4;
      ctx.fillRect(x - cam.x + h * 40 + wob, y - cam.y + h * 30, 22 + h * 20, 2);
    }
  }
}

function drawLand(ctx, G, cam) {
  ctx.fillStyle = "#1d2a33";
  for (const isl of G.world.islands) {
    ctx.beginPath();
    ctx.ellipse(isl.cx - cam.x, isl.cy - cam.y, isl.rx, isl.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c9b083";
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  for (const b of G.world.bridges) {
    ctx.strokeStyle = "#232c38";
    ctx.lineWidth = b.w;
    ctx.beginPath();
    ctx.moveTo(b.x1 - cam.x, b.y1 - cam.y);
    ctx.lineTo(b.x2 - cam.x, b.y2 - cam.y);
    ctx.stroke();
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.moveTo(b.x1 - cam.x, b.y1 - cam.y);
    ctx.lineTo(b.x2 - cam.x, b.y2 - cam.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Bridge lamps.
    ctx.fillStyle = "#ffe9a8";
    const len = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    const n = Math.floor(len / 130);
    for (let i = 0; i <= n; i++) {
      const t = i / Math.max(1, n);
      ctx.beginPath();
      ctx.arc(b.x1 + (b.x2 - b.x1) * t - cam.x, b.y1 + (b.y2 - b.y1) * t - cam.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRoads(ctx, G, cam) {
  for (const r of G.world.roads) {
    if (r.name.includes("Causeway") || r.name.includes("Span")) continue;
    ctx.strokeStyle = "#11161f";
    ctx.lineWidth = 46;
    ctx.beginPath();
    ctx.moveTo(r.x1 - cam.x, r.y1 - cam.y);
    ctx.lineTo(r.x2 - cam.x, r.y2 - cam.y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,235,160,0.5)";
    ctx.lineWidth = 2;
    ctx.setLineDash([16, 20]);
    ctx.beginPath();
    ctx.moveTo(r.x1 - cam.x, r.y1 - cam.y);
    ctx.lineTo(r.x2 - cam.x, r.y2 - cam.y);
    ctx.stroke();
    ctx.setLineDash([]);
    // Sidewalk edges.
    ctx.strokeStyle = "rgba(190,205,225,0.20)";
    ctx.lineWidth = 50;
    ctx.globalCompositeOperation = "destination-over";
    ctx.globalCompositeOperation = "source-over";
  }
  // Wet sheen: neon-tinted reflections shimmering on the asphalt.
  ctx.fillStyle = "rgba(60,140,220,0.05)";
  ctx.fillRect(0, 0, cam.w, cam.h);
}

function drawBuildings(ctx, G, cam) {
  for (const b of G.world.buildings) {
    const sx = b.x - cam.x;
    const sy = b.y - cam.y;
    if (sx < -140 || sy < -140 || sx > cam.w + 140 || sy > cam.h + 140) continue;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(sx - b.w / 2 + 5, sy - b.h / 2 + 7, b.w, b.h);
    ctx.fillStyle = b.wall;
    ctx.fillRect(sx - b.w / 2, sy - b.h / 2, b.w, b.h);
    ctx.strokeStyle = b.neon;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55 + Math.sin(G.time * 2 + b.seed) * 0.18;
    ctx.strokeRect(sx - b.w / 2, sy - b.h / 2, b.w, b.h);
    ctx.globalAlpha = 1;
    // Lit windows, stable per building.
    const cols = Math.max(2, Math.floor(b.w / 16));
    const rows = Math.max(2, Math.floor(b.h / 15));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const lit = hash2(b.seed + i * 7, j * 13);
        if (lit < 0.45) continue;
        ctx.fillStyle = lit > 0.85 ? b.neon : "#ffd98a";
        ctx.globalAlpha = 0.5 + lit * 0.4;
        ctx.fillRect(sx - b.w / 2 + 6 + i * 15, sy - b.h / 2 + 6 + j * 14, 7, 8);
      }
    }
    ctx.globalAlpha = 1;
  }
}

function drawPois(ctx, G, cam) {
  for (const poi of G.world.pois) {
    const sx = poi.x - cam.x;
    const sy = poi.y - cam.y;
    if (sx < -60 || sy < -60 || sx > cam.w + 60 || sy > cam.h + 60) continue;
    const pulse = 1 + Math.sin(G.time * 3 + poi.x) * 0.12;
    ctx.fillStyle = "rgba(10,14,22,0.85)";
    ctx.strokeStyle = poi.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 15 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = poi.color;
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    const glyph = { fixer: "F", garage: "G", shop: "A", chopshop: "C", marina: "M", safehouse: "S", airstrip: "R" }[poi.kind] || "?";
    ctx.fillText(glyph, sx, sy + 5);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(230,240,255,0.85)";
    ctx.fillText(poi.name, sx, sy + 32);
  }
}

function drawVehicleShape(ctx, G, v, cam, isPlayer) {
  const sx = v.x - cam.x;
  const sy = v.y - cam.y;
  if (sx < -80 || sy < -80 || sx > cam.w + 80 || sy > cam.h + 80) return;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(v.angle);
  if (v.kind === "boat") {
    if (v.wake) {
      ctx.rotate(-v.angle);
      for (const w of v.wake) {
        ctx.fillStyle = "rgba(190,230,255," + (w.life * 0.38).toFixed(3) + ")";
        ctx.beginPath();
        ctx.ellipse(w.x - v.x, w.y - v.y, 17 * (1.7 - w.life), 7 * (1.7 - w.life), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.rotate(v.angle);
    }
    ctx.fillStyle = v.color;
    ctx.beginPath();
    ctx.moveTo(24, 0);
    ctx.lineTo(8, -9);
    ctx.lineTo(-22, -9);
    ctx.lineTo(-22, 9);
    ctx.lineTo(8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#12202e";
    ctx.fillRect(-8, -5, 14, 10);
  } else {
    // Headlight cones on wet ground.
    if (!v.wrecked) {
      const grad = ctx.createLinearGradient(18, 0, 120, 0);
      grad.addColorStop(0, "rgba(255,240,190,0.20)");
      grad.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(18, -7);
      ctx.lineTo(120, -26);
      ctx.lineTo(120, 26);
      ctx.lineTo(18, 7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = v.wrecked ? "#3a3f47" : v.color;
    ctx.beginPath();
    ctx.roundRect(-20, -10, 40, 20, 5);
    ctx.fill();
    ctx.fillStyle = "#10151f";
    ctx.beginPath();
    ctx.roundRect(-6, -8, 15, 16, 3);
    ctx.fill();
    ctx.fillStyle = "#ffeeb0";
    ctx.fillRect(18, -8, 3, 4);
    ctx.fillRect(18, 4, 3, 4);
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(-21, -8, 3, 4);
    ctx.fillRect(-21, 4, 3, 4);
    if (v.policeLight) {
      const phase = Math.floor(G.time * 6 + (v.siren || 0)) % 2;
      ctx.fillStyle = phase ? "#ff2d55" : "#2d7dff";
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (v.targetCar) {
      ctx.strokeStyle = "#ffd34d";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-26, -16, 52, 32);
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
  if (isPlayer) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(sx, sy - 30 - Math.sin(G.time * 4) * 2);
    ctx.lineTo(sx - 6, sy - 40 - Math.sin(G.time * 4) * 2);
    ctx.lineTo(sx + 6, sy - 40 - Math.sin(G.time * 4) * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPerson(ctx, x, y, cam, color, angle, opts = {}) {
  const sx = x - cam.x;
  const sy = y - cam.y;
  if (sx < -30 || sy < -30 || sx > cam.w + 30 || sy > cam.h + 30) return;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(sx, sy + 3, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(sx, sy, opts.r || 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e8c39a";
  ctx.beginPath();
  ctx.arc(sx + Math.cos(angle) * 3, sy + Math.sin(angle) * 3, 3.6, 0, Math.PI * 2);
  ctx.fill();
  if (opts.gun) {
    ctx.strokeStyle = "#cfd6e4";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * 15, sy + Math.sin(angle) * 15);
    ctx.stroke();
  }
}

export function drawWorld(ctx, G) {
  const cam = G.camera;
  const shakeX = cam.shake ? (Math.random() - 0.5) * cam.shake * 8 : 0;
  const shakeY = cam.shake ? (Math.random() - 0.5) * cam.shake * 8 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawWater(ctx, G, cam);
  drawLand(ctx, G, cam);
  drawRoads(ctx, G, cam);
  // Palm trees.
  ctx.fillStyle = "#14402a";
  for (const t of G.world.trees) {
    const sx = t.x - cam.x;
    const sy = t.y - cam.y;
    if (sx < -30 || sy < -30 || sx > cam.w + 30 || sy > cam.h + 30) continue;
    ctx.beginPath();
    ctx.arc(sx, sy, t.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d5c3a";
    ctx.beginPath();
    ctx.arc(sx - 2, sy - 2, t.r * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#14402a";
  }
  drawBuildings(ctx, G, cam);
  drawPois(ctx, G, cam);
  // Pickups.
  for (const pk of G.combat.pickups) {
    const sx = pk.x - cam.x;
    const sy = pk.y - cam.y + Math.sin(pk.bob) * 2;
    if (sx < -30 || sy < -30 || sx > cam.w + 30 || sy > cam.h + 30) continue;
    const colors = { health: "#ff4d6d", armor: "#4dc9ff", ammo: "#ffd34d", cash: "#7dffb0" };
    ctx.fillStyle = colors[pk.kind] || "#fff";
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0a0f18";
    ctx.font = "bold 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText({ health: "+", armor: "A", ammo: "9", cash: "$" }[pk.kind] || "?", sx, sy + 4);
  }
  // Objective marker beam.
  const obj = G.objective;
  if (obj && G.state === "play") {
    const sx = obj.x - cam.x;
    const sy = obj.y - cam.y;
    const grad = ctx.createLinearGradient(0, sy - 190, 0, sy);
    grad.addColorStop(0, "rgba(255,211,77,0)");
    grad.addColorStop(1, "rgba(255,211,77,0.5)");
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 7, sy - 190, 14, 190);
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx, sy, 20 + Math.sin(G.time * 4) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const ped of G.pedestrians) {
    if (ped.down) {
      ctx.fillStyle = "#5a2b33";
      const sx = ped.x - cam.x; const sy = ped.y - cam.y;
      ctx.fillRect(sx - 8, sy - 3, 16, 6);
    } else {
      drawPerson(ctx, ped.x, ped.y, cam, ped.color, ped.angle);
    }
  }
  for (const e of G.combat.enemies) drawPerson(ctx, e.x, e.y, cam, "#8c2f39", e.angle, { gun: true, r: 8.5 });
  for (const v of G.traffic) drawVehicleShape(ctx, G, v, cam, false);
  for (const v of G.vehicles) drawVehicleShape(ctx, G, v, cam, G.player.inVehicle === v);
  for (const u of G.police.units) {
    if (u.kind === "foot") drawPerson(ctx, u.x, u.y, cam, "#2d4d8f", u.angle, { gun: true, r: 8.5 });
    else {
      const shaped = Object.assign({}, u, { policeLight: u.kind === "car" });
      drawVehicleShape(ctx, G, shaped, cam, false);
    }
  }
  // The player on foot.
  const p = G.player;
  if (!p.inVehicle) {
    drawPerson(ctx, p.x, p.y, cam, p.swimming ? "#2e7fc2" : "#ff4fa3", p.aim, { gun: p.hasGun, r: 9 });
    if (G.combat.muzzle > 0) {
      ctx.fillStyle = "#ffe28a";
      ctx.beginPath();
      ctx.arc(p.x - cam.x + Math.cos(p.aim) * 20, p.y - cam.y + Math.sin(p.aim) * 20, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Bullets as tracers.
  ctx.strokeStyle = "#ffe9a8";
  ctx.lineWidth = 2;
  for (const b of G.combat.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - cam.x, b.y - cam.y);
    ctx.lineTo(b.x - cam.x - b.vx * 0.016, b.y - cam.y - b.vy * 0.016);
    ctx.stroke();
  }
  // Helicopter and its spotlight.
  if (G.police.heli) {
    const h = G.police.heli;
    const sx = h.x - cam.x;
    const sy = h.y - cam.y;
    const px = p.x - cam.x;
    const py = p.y - cam.y;
    const grad = ctx.createRadialGradient(px, py, 8, px, py, 95);
    grad.addColorStop(0, "rgba(255,250,210,0.34)");
    grad.addColorStop(1, "rgba(255,250,210,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(px - 70, py + 40);
    ctx.lineTo(px + 70, py + 40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(h.angle);
    ctx.fillStyle = "#33456b";
    ctx.beginPath();
    ctx.roundRect(-24, -8, 48, 16, 8);
    ctx.fill();
    ctx.strokeStyle = "#e8eefc";
    ctx.lineWidth = 2;
    ctx.strokeRect(-24, -8, 48, 16);
    ctx.strokeStyle = "#cfd6e4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(36, 0);
    ctx.stroke();
    ctx.fillStyle = Math.floor(G.time * 3) % 2 ? "#ff2d55" : "#ffe28a";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Night grade and rain.
  const night = nightAmount(G);
  ctx.fillStyle = "rgba(4,8,26," + (0.16 + night * 0.14).toFixed(3) + ")";
  ctx.fillRect(0, 0, cam.w, cam.h);
  if (G.weather.rain > 0.05) drawRain(ctx, G, cam);
  if (G.flashRed > 0) {
    ctx.fillStyle = "rgba(220,30,50," + G.flashRed.toFixed(3) + ")";
    ctx.fillRect(0, 0, cam.w, cam.h);
  }
  // District name, bottom left of the world view.
  ctx.fillStyle = "rgba(220,235,255,0.75)";
  ctx.font = "600 15px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(districtAt(p.x, p.y) + " — Marisol Keys", 16, cam.h - 14);
  ctx.restore();
}

function drawRain(ctx, G, cam) {
  const amount = G.weather.rain;
  ctx.strokeStyle = "rgba(170,210,255," + (0.25 + amount * 0.3).toFixed(3) + ")";
  ctx.lineWidth = 1;
  const n = Math.floor(130 * amount);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const rx = hash2(i, Math.floor(G.time * 14)) * cam.w;
    const ry = (hash2(i * 3, Math.floor(G.time * 14) + 9) * cam.h + (G.time * 640 + i * 37) % 120) % cam.h;
    ctx.moveTo(rx, ry);
    ctx.lineTo(rx - 5, ry + 15);
  }
  ctx.stroke();
}
