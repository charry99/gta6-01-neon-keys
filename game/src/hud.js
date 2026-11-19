// HUD and minimap: cash, health, armour, wanted stars, the live map
// with police and mission blips, objective text, exposure and speed.

import { WORLD_H, WORLD_W } from "./world.js";

function bar(ctx, x, y, w, h, frac, color, back) {
  ctx.fillStyle = back || "rgba(8,12,20,0.72)";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, frac))), h - 2);
}

function stars(ctx, x, y, n, seen) {
  ctx.font = "19px system-ui, sans-serif";
  ctx.textAlign = "left";
  for (let i = 0; i < 5; i++) {
    const on = i < n;
    const blink = seen && on && Math.floor(performance.now() / 300) % 2 === 0;
    ctx.fillStyle = on ? (blink ? "#ffffff" : "#ffd34d") : "rgba(255,255,255,0.22)";
    ctx.fillText("★", x + i * 20, y);
  }
}

export function formatClock(clock) {
  const hh = Math.floor(clock) % 24;
  const mm = Math.floor((clock - Math.floor(clock)) * 60);
  return String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
}

export function drawMinimap(ctx, G, x, y, w, h) {
  ctx.fillStyle = "rgba(5,16,28,0.88)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(120,200,255,0.5)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  const sx = (wx) => x + (wx / WORLD_W) * w;
  const sy = (wy) => y + (wy / WORLD_H) * h;
  // Islands.
  ctx.fillStyle = "#2c4a3a";
  for (const isl of G.world.islands) {
    ctx.beginPath();
    ctx.ellipse(sx(isl.cx), sy(isl.cy), (isl.rx / WORLD_W) * w, (isl.ry / WORLD_H) * h, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#4a5a6a";
  ctx.lineWidth = 3;
  for (const b of G.world.bridges) {
    ctx.beginPath();
    ctx.moveTo(sx(b.x1), sy(b.y1));
    ctx.lineTo(sx(b.x2), sy(b.y2));
    ctx.stroke();
  }
  // POI dots.
  for (const poi of G.world.pois) {
    ctx.fillStyle = poi.color;
    ctx.fillRect(sx(poi.x) - 2, sy(poi.y) - 2, 4, 4);
  }
  // Police blips flash red and blue.
  const flash = Math.floor(performance.now() / 280) % 2 === 0;
  for (const u of G.police.units) {
    ctx.fillStyle = flash ? "#ff2d55" : "#2d7dff";
    ctx.beginPath();
    ctx.arc(sx(u.x), sy(u.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (G.police.heli) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(sx(G.police.heli.x) - 3, sy(G.police.heli.y) - 1, 6, 2);
  }
  // Mission target.
  if (G.objective) {
    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.arc(sx(G.objective.x), sy(G.objective.y), 4.5 + Math.sin(G.time * 5) * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (G.missions.targetVehicle) {
    ctx.fillStyle = "#ff4fa3";
    ctx.fillRect(sx(G.missions.targetVehicle.x) - 3, sy(G.missions.targetVehicle.y) - 3, 6, 6);
  }
  // Player arrow.
  const p = G.player;
  ctx.save();
  ctx.translate(sx(p.x), sy(p.y));
  ctx.rotate(p.angle);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.lineTo(-4, -4);
  ctx.lineTo(-4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(220,235,255,0.8)";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("MARISOL KEYS", x + 6, y + h - 5);
}

export function drawHUD(ctx, G) {
  const cam = G.camera;
  const p = G.player;
  const W = cam.w;
  // Top-left panel.
  ctx.fillStyle = "rgba(5,10,18,0.66)";
  ctx.beginPath();
  ctx.roundRect(12, 12, 300, 104, 8);
  ctx.fill();
  ctx.fillStyle = "#7dffb0";
  ctx.font = "bold 21px system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("$" + Math.floor(p.cash), 24, 40);
  ctx.fillStyle = "rgba(230,240,255,0.9)";
  ctx.font = "13px system-ui, sans-serif";
  ctx.fillText("VERA SOLANO", 118, 40);
  ctx.textAlign = "right";
  ctx.fillText(formatClock(G.clock) + (G.weather.rain > 0.4 ? " RAIN" : " CLEAR"), 300, 40);
  ctx.textAlign = "left";
  bar(ctx, 24, 50, 276, 11, p.hp / p.maxHp, p.hp > 30 ? "#59d977" : "#ff4d6d");
  bar(ctx, 24, 66, 276, 8, p.armor / 100, "#4dc9ff");
  ctx.fillStyle = "rgba(230,240,255,0.85)";
  ctx.font = "11px system-ui, sans-serif";
  ctx.fillText("PISTOL " + p.ammo + " rounds", 24, 90);
  if (G.police.lastCrime) ctx.fillText(G.police.lastCrime, 118, 90);
  stars(ctx, 24, 110, G.police.stars, G.police.seen);
  ctx.font = "bold 12px system-ui, sans-serif";
  if (G.police.seen && G.police.stars > 0) {
    ctx.fillStyle = "#ff8fa3";
    ctx.fillText("SEEN", 132, 110);
  } else if (G.police.stars > 0) {
    ctx.fillStyle = "#8fd8ff";
    ctx.fillText("HIDDEN — cooling", 132, 110);
  }
  // Busted meter.
  if (G.police.bustedMeter > 0.02) {
    ctx.fillStyle = "#ff2d55";
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BUSTED?", W / 2, 120);
    bar(ctx, W / 2 - 110, 128, 220, 10, G.police.bustedMeter, "#ff2d55");
    ctx.textAlign = "left";
  }
  // Minimap top-right.
  drawMinimap(ctx, G, W - 236, 12, 224, 168);
  // Objective strip, bottom centre.
  if (G.objective && G.state === "play") {
    ctx.fillStyle = "rgba(5,10,18,0.72)";
    const label = G.objective.label;
    ctx.font = "14px system-ui, sans-serif";
    const tw = Math.min(760, ctx.measureText(label).width + 36);
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2, cam.h - 66, tw, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#ffd34d";
    ctx.textAlign = "center";
    ctx.fillText(label, W / 2, cam.h - 46);
    ctx.textAlign = "left";
    // Off-screen direction arrow for the objective.
    const dx = G.objective.x - p.x;
    const dy = G.objective.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d > 320) {
      const ax = W / 2 + Math.cos(Math.atan2(dy, dx)) * 54;
      const ay = cam.h - 92 + Math.sin(Math.atan2(dy, dx)) * 20;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.fillStyle = "#ffd34d";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,211,77,0.85)";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(d / 10) + "m", W / 2, cam.h - 76);
      ctx.textAlign = "left";
    }
  }
  // Mission timer.
  const M = G.missions;
  if ((M.phase === "go" || M.phase === "carry") && !M.storyDone) {
    ctx.fillStyle = M.timer < 20 ? "#ff4d6d" : "#dfe8ff";
    ctx.font = "bold 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TIME " + Math.max(0, Math.ceil(M.timer)) + "s", W / 2, 34);
    ctx.textAlign = "left";
  }
  if (M.side && M.side.time) {
    ctx.fillStyle = "#dfe8ff";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((M.side.kind === "fare" ? "FARE " : "TIME ") + Math.max(0, Math.ceil(M.side.time)) + "s", W / 2, 56);
    ctx.textAlign = "left";
  }
  // Smuggling exposure meter.
  if (G.smuggling) {
    ctx.fillStyle = "rgba(230,240,255,0.9)";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CARGO EXPOSURE", W / 2, cam.h - 152);
    bar(ctx, W / 2 - 130, cam.h - 146, 260, 10, M.exposure, M.exposure > 0.66 ? "#ff2d55" : "#ffb02e");
    ctx.textAlign = "left";
  }
  // Speed and vehicle state, bottom right.
  if (p.inVehicle) {
    const v = p.inVehicle;
    ctx.fillStyle = "rgba(5,10,18,0.66)";
    ctx.beginPath();
    ctx.roundRect(W - 216, cam.h - 84, 204, 72, 8);
    ctx.fill();
    ctx.fillStyle = "#dfe8ff";
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.fillText(Math.round(Math.abs(v.speed) * 0.36) + " km/h", W - 200, cam.h - 52);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(v.name + (v.kind === "boat" ? " — boat" : " — car"), W - 200, cam.h - 32);
    bar(ctx, W - 200, cam.h - 26, 170, 6, v.hp / 100, "#ffb02e");
  }
  // Context prompt.
  if (G.prompt) {
    ctx.fillStyle = "rgba(5,10,18,0.8)";
    ctx.font = "14px system-ui, sans-serif";
    const tw = ctx.measureText(G.prompt).width + 30;
    ctx.beginPath();
    ctx.roundRect(W / 2 - tw / 2, cam.h - 116, tw, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(G.prompt, W / 2, cam.h - 97);
    ctx.textAlign = "left";
  }
  // Toast notifications.
  ctx.font = "14px system-ui, sans-serif";
  let ty = 150;
  for (const n of G.notices) {
    ctx.fillStyle = "rgba(5,10,18," + (0.55 * n.alpha).toFixed(3) + ")";
    const tw = ctx.measureText(n.text).width + 24;
    ctx.beginPath();
    ctx.roundRect(14, ty - 15, tw, 24, 6);
    ctx.fill();
    ctx.fillStyle = "rgba(255,240,200," + n.alpha.toFixed(3) + ")";
    ctx.fillText(n.text, 26, ty + 2);
    ty += 30;
  }
  if (G.sound.muted) {
    ctx.fillStyle = "rgba(230,240,255,0.6)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("SOUND OFF (M)", W - 110, cam.h - 14);
  }
}
