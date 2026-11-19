// Saving and loading through the browser's local storage.
// A bought safehouse is the save point: it also heals Vera and,
// when she lies low there, clears the wanted level.

const KEY = "neon-keys-save-v1";

export function saveGame(G) {
  try {
    const data = {
      cash: Math.floor(G.player.cash),
      hp: Math.round(G.player.hp),
      armor: Math.round(G.player.armor),
      ammo: G.player.ammo,
      storyIndex: G.missions.storyIndex,
      storyDone: G.missions.storyDone,
      owned: G.ownedSafehouses,
      x: Math.round(G.player.x),
      y: Math.round(G.player.y),
      clock: G.clock,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export function applySave(G, data) {
  const p = G.player;
  if (typeof data.cash === "number") p.cash = data.cash;
  if (typeof data.hp === "number") p.hp = Math.max(10, Math.min(p.maxHp, data.hp));
  if (typeof data.armor === "number") p.armor = data.armor;
  if (typeof data.ammo === "number") p.ammo = data.ammo;
  if (typeof data.storyIndex === "number") G.missions.storyIndex = data.storyIndex;
  if (data.storyDone) G.missions.storyDone = true;
  if (Array.isArray(data.owned)) G.ownedSafehouses = data.owned;
  if (typeof data.x === "number" && typeof data.y === "number") { p.x = data.x; p.y = data.y; }
  if (typeof data.clock === "number") G.clock = data.clock;
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (err) { /* storage unavailable */ }
}

export function hasSave() {
  return loadSave() !== null;
}
