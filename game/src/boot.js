// Neon Keys bootstrap: builds the world, wires input and menus,
// runs the main loop and handles garages, shops and safehouses.

import { buildWorld, isLand } from "./world.js";
import { createPlayer, updatePlayer } from "./player.js";
import { spawnVehicles, nearestVehicle, enterVehicle, exitVehicle, updatePlayerVehicle } from "./vehicles.js";
import { spawnTraffic, updateTraffic } from "./traffic.js";
import { spawnPedestrians, updatePedestrians } from "./pedestrians.js";
import { createPolice, updatePolice } from "./police.js";
import { createMissions, updateMissions, offerSideWork } from "./missions.js";
import { createCombat, seedPickups, updateCombat, fistAttack } from "./combat.js";
import { SoundEngine } from "./sound.js";
import { createCamera, updateCamera, drawWorld } from "./render.js";
import { drawHUD } from "./hud.js";
import { saveGame, loadSave, applySave, hasSave } from "./save.js";
import { sceneFromUrl, applyScene, updateAutopilot } from "./staging.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (G) { G.camera.w = canvas.width; G.camera.h = canvas.height; }
}
window.addEventListener("resize", resize);

function makeGame() {
  const world = buildWorld();
  const game = {
    world,
    state: "menu",
    time: 0,
    clock: 21.5,
    player: createPlayer(1030, 1620),
    vehicles: [],
    traffic: [],
    pedestrians: [],
    police: createPolice(),
    missions: createMissions(),
    combat: createCombat(),
    camera: createCamera(),
    sound: new SoundEngine(),
    input: { keys: new Set(), mouseX: 0, mouseY: 0, mouseDown: false },
    weather: { rain: 0, target: 0, stormT: 20, forced: null },
    notices: [],
    events: [],
    objective: null,
    prompt: "",
    flashRed: 0,
    smuggling: false,
    ownedSafehouses: [],
    saveSoon: false,
    scene: null,
    autopilot: null,
    notify(text) {
      this.notices.push({ text, alpha: 1, t: 0 });
      if (this.notices.length > 4) this.notices.shift();
    },
    logEvent(text) {
      this.events.push(text);
      if (this.events.length > 30) this.events.shift();
    },
    allVehicles() {
      const policeVehicles = this.police.units.filter((u) => u.kind === "car" || u.kind === "boat");
      return [...this.vehicles, ...this.traffic, ...policeVehicles];
    },
  };
  game.vehicles = spawnVehicles(world);
  game.traffic = spawnTraffic();
  game.pedestrians = spawnPedestrians(world);
  seedPickups(game);
  game.camera.x = game.player.x - 640;
  game.camera.y = game.player.y - 400;
  return game;
}

let G = makeGame();
resize();

// ---------- input ----------
window.addEventListener("keydown", (ev) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(ev.code)) ev.preventDefault();
  if (ev.repeat) return;
  G.input.keys.add(ev.code);
  G.sound.ensure();
  if (ev.code === "KeyM") {
    G.sound.setMuted(!G.sound.muted);
    G.notify(G.sound.muted ? "Sound off" : "Sound on");
  }
  if (ev.code === "KeyP" || ev.code === "Escape") togglePause();
  if (G.state !== "play") return;
  if (ev.code === "KeyE") interact();
  if (ev.code === "KeyF") fistAttack(G);
});
window.addEventListener("keyup", (ev) => G.input.keys.delete(ev.code));
canvas.addEventListener("mousemove", (ev) => {
  G.input.mouseX = ev.clientX;
  G.input.mouseY = ev.clientY;
});
canvas.addEventListener("mousedown", (ev) => {
  G.sound.ensure();
  if (ev.button === 0) G.input.mouseDown = true;
});
window.addEventListener("mouseup", () => { G.input.mouseDown = false; });
canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

// ---------- interactions ----------
function nearestPoi(kind, maxDist) {
  let best = null;
  let bd = maxDist;
  for (const poi of G.world.pois) {
    if (kind && poi.kind !== kind) continue;
    const d = Math.hypot(poi.x - G.player.x, poi.y - G.player.y);
    if (d < bd) { bd = d; best = poi; }
  }
  return best;
}

function interact() {
  const p = G.player;
  if (p.inVehicle) { exitVehicle(G); return; }
  const v = nearestVehicle(G, p.x, p.y, 52);
  if (v) { enterVehicle(G, v); return; }
  const poi = nearestPoi(null, 58);
  if (!poi) return;
  if (poi.kind === "garage") {
    if (G.police.stars > 0) {
      if (p.cash >= 150) {
        p.cash -= 150;
        G.police.clear(G, true);
      } else G.notify("Lay-low costs $150. You have $" + Math.floor(p.cash) + ".");
    } else G.notify("The garage crew keeps your ride ready. No heat right now.");
  } else if (poi.kind === "shop") {
    if (p.cash >= 90) {
      p.cash -= 90;
      p.ammo += 24;
      p.armor = Math.min(100, p.armor + 50);
      G.sound.pickup();
      G.notify("Bought 24 rounds and armour for $90.");
    } else G.notify("Ammo and armour bundle is $90.");
  } else if (poi.kind === "safehouse") {
    if (G.ownedSafehouses.includes(poi.name)) {
      p.hp = p.maxHp;
      G.police.clear(G, true);
      saveGame(G);
      G.notify(poi.name + ": rested, healed, saved. Heat cleared.");
    } else if (p.cash >= poi.price) {
      p.cash -= poi.price;
      G.ownedSafehouses.push(poi.name);
      saveGame(G);
      G.notify("Bought " + poi.name + " for $" + poi.price + ". Lie low here any time.");
    } else G.notify(poi.name + " costs $" + poi.price + ".");
  } else if (poi.kind === "fixer") {
    offerSideWork(G, "smuggle");
  } else if (poi.kind === "chopshop") {
    offerSideWork(G, "stealboard");
  } else if (poi.kind === "marina") {
    offerSideWork(G, "fare");
  } else if (poi.kind === "airstrip") {
    G.notify("Aero Key Strip. The final run ends here, one day.");
  }
}

function computePrompt() {
  const p = G.player;
  if (p.inVehicle) { G.prompt = "E — get out"; return; }
  const v = nearestVehicle(G, p.x, p.y, 52);
  if (v) { G.prompt = "E — " + (v.kind === "boat" ? "board the " : "steal the ") + v.name; return; }
  const poi = nearestPoi(null, 58);
  if (poi) {
    const labels = {
      garage: "E — lay low at the garage ($150)",
      shop: "E — buy ammo + armour ($90)",
      chopshop: "E — steal-to-order board",
      fixer: "E — ask about smuggling work",
      marina: "E — ask about boat fares",
      airstrip: "Aero Key Strip",
    };
    if (poi.kind === "safehouse") {
      G.prompt = G.ownedSafehouses.includes(poi.name) ? "E — lie low, heal and save" : "E — buy " + poi.name + " ($" + poi.price + ")";
    } else G.prompt = labels[poi.kind] || poi.name;
    return;
  }
  G.prompt = "";
}

// ---------- menus ----------
const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const endScreen = document.getElementById("endScreen");
const endTitle = document.getElementById("endTitle");
const endText = document.getElementById("endText");
const continueBtn = document.getElementById("continueBtn");
if (hasSave()) continueBtn.style.display = "inline-block";

function startGame(withSave) {
  G.sound.ensure();
  if (withSave) {
    const data = loadSave();
    if (data) applySave(G, data);
  }
  G.state = "play";
  startScreen.style.display = "none";
  endScreen.style.display = "none";
  G.notify("Vera Solano is back in Cayo Brisa. Meet the fixer.");
}
document.getElementById("startBtn").addEventListener("click", () => startGame(false));
continueBtn.addEventListener("click", () => startGame(true));
document.getElementById("resumeBtn").addEventListener("click", () => togglePause());
document.getElementById("restartBtn").addEventListener("click", () => {
  G = makeGame();
  resize();
  endScreen.style.display = "none";
  startScreen.style.display = "flex";
  if (hasSave()) continueBtn.style.display = "inline-block";
});
document.getElementById("saveBtn").addEventListener("click", () => {
  if (saveGame(G)) G.notify("Game saved.");
  togglePause();
});

function togglePause() {
  if (G.state === "play") {
    G.state = "pause";
    pauseScreen.style.display = "flex";
  } else if (G.state === "pause") {
    G.state = "play";
    pauseScreen.style.display = "none";
  }
}

let endShown = false;
function checkEnd() {
  if ((G.state === "wasted" || G.state === "busted") && !endShown) {
    endShown = true;
    endTitle.textContent = G.state === "wasted" ? "WASTED" : "BUSTED";
    endText.textContent = G.state === "wasted"
      ? "Vera washes up at the Brisa clinic, lighter by $100 of hospital fees."
      : "The patrol takes Vera in. The crew bribes her out by morning, for $100.";
    G.player.cash = Math.max(0, G.player.cash - 100);
    endScreen.style.display = "flex";
  }
  if (G.state === "play") endShown = false;
}
document.getElementById("againBtn").addEventListener("click", () => {
  const keepCash = G.player.cash;
  const storyIndex = G.missions.storyIndex;
  G = makeGame();
  resize();
  G.player.cash = keepCash;
  G.missions.storyIndex = storyIndex;
  G.state = "play";
  endScreen.style.display = "none";
  endShown = false;
});

// ---------- weather ----------
function updateWeather(G, dt) {
  const w = G.weather;
  if (w.forced !== null && w.forced !== undefined) {
    w.rain += (w.forced - w.rain) * Math.min(1, dt * 0.8);
  } else {
    w.stormT -= dt;
    if (w.stormT <= 0) {
      w.target = w.target > 0.3 ? 0 : 0.45 + Math.random() * 0.55;
      w.stormT = 24 + Math.random() * 40;
      if (w.target > 0.3) G.notify("Rain rolls in off the sea. Roads are slippery.");
    }
    w.rain += (w.target - w.rain) * Math.min(1, dt * 0.25);
  }
  G.sound.setRain(w.rain);
}

// ---------- main loop ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (G.state === "play") {
    G.time += dt;
    G.clock = (G.clock + dt * (24 / 600)) % 24;
    updateWeather(G, dt);
    updateAutopilot(G, dt);
    updatePlayer(G, dt);
    updatePlayerVehicle(G, dt);
    updateTraffic(G, dt);
    updatePedestrians(G, dt);
    updatePolice(G, dt);
    updateCombat(G, dt);
    updateMissions(G, dt);
    computePrompt();
    G.flashRed = Math.max(0, G.flashRed - dt * 1.4);
    for (const n of G.notices) { n.t += dt; n.alpha = Math.max(0, 1 - Math.max(0, n.t - 2.6)); }
    G.notices = G.notices.filter((n) => n.alpha > 0);
    if (G.saveSoon) { G.saveSoon = false; saveGame(G); }
  }
  updateCamera(G, dt);
  drawWorld(ctx, G);
  if (G.state !== "menu") drawHUD(ctx, G);
  checkEnd();
}
requestAnimationFrame(frame);

// Staged screenshot scenes start in play immediately.
const scene = sceneFromUrl();
if (scene) {
  applyScene(G, scene);
  G.state = "play";
  startScreen.style.display = "none";
}
