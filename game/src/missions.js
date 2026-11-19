// Missions and side work for the Brisa crew: a six-part story chain,
// a steal-to-order board, smuggling runs with an exposure meter,
// and boat fares between the marinas.

import { isWater } from "./world.js";
import { spawnGuards } from "./combat.js";

export const STORY = [
  {
    title: "First Run",
    text: "Take a car over the Brisa Causeway. Deliver the package to the Norte Marina.",
    type: "deliver", need: "car",
    from: { x: 980, y: 1560 }, to: { x: 3080, y: 1010 },
    reward: 220, time: 150,
  },
  {
    title: "Lift to Order",
    text: "Steal the marked Casino GT from the Fortuna Strip and bring it to the Mire Chop Shop, clean.",
    type: "steal",
    from: { x: 1620, y: 1880 }, to: { x: 3380, y: 760 },
    reward: 340, time: 210,
  },
  {
    title: "Night Water",
    text: "Pick up cargo at Brisa Marina and run it by boat to Fortuna Marina. Patrol water out there.",
    type: "boat",
    from: { x: 620, y: 1980 }, to: { x: 3180, y: 2880 },
    reward: 420, time: 200,
  },
  {
    title: "Casino Cash",
    text: "Collect the cash bag on the Fortuna Strip and get it to the fixer. Heat will follow.",
    type: "pickup", heat: 2.2,
    from: { x: 1500, y: 2010 }, to: { x: 980, y: 1560 },
    reward: 520, time: 170,
  },
  {
    title: "Ambush",
    text: "The drop in Old Town is a setup. Survive it and lose the patrol: drop below one star.",
    type: "escape",
    from: { x: 2050, y: 2250 }, to: { x: 2050, y: 2250 },
    reward: 650, time: 240,
  },
  {
    title: "One Season",
    text: "Final run: fixer, Norte Marina, Aero Key strip, then home to the fixer. Against the clock.",
    type: "tour",
    from: { x: 980, y: 1560 },
    stops: [{ x: 3080, y: 1010 }, { x: 3750, y: 2480 }, { x: 980, y: 1560 }],
    reward: 1200, time: 330,
  },
];

const TARGET_NAMES = ["Strip Roadster", "Casino GT", "Palma Sedan", "Brisa Coupe", "Norte Hatch"];

export function createMissions() {
  return {
    storyIndex: 0, storyDone: false,
    phase: "offer", // offer -> go -> carry -> done
    timer: 0, cargo: false, exposure: 0, stopIndex: 0,
    targetVehicle: null, startHp: 100,
    side: null, sideT: 0,
    startStory(G) {
      const m = STORY[this.storyIndex];
      if (!m) { this.storyDone = true; return; }
      this.phase = "go";
      this.timer = m.time || 0;
      this.cargo = false;
      this.exposure = 0;
      this.stopIndex = 0;
      if (m.type === "steal") {
        // Mark the car to lift.
        let best = null; let bd = Infinity;
        for (const v of G.vehicles) {
          if (v.kind !== "car") continue;
          const d = Math.hypot(v.x - m.from.x, v.y - m.from.y);
          if (d < bd) { bd = d; best = v; }
        }
        if (best) {
          best.targetCar = true;
          best.name = "Casino GT";
          best.x = m.from.x; best.y = m.from.y;
          this.targetVehicle = best;
          this.startHp = best.hp;
        }
      }
      if (m.type === "boat" || m.type === "pickup") {
        spawnGuards(G, [[m.from.x + 60, m.from.y + 30], [m.from.x - 70, m.from.y - 20]]);
      }
      if (m.type === "escape") {
        spawnGuards(G, [[m.from.x + 50, m.from.y], [m.from.x - 50, m.from.y + 40]]);
        G.police.addCrime(G, 4.2, "Ambush in Old Town");
      }
      G.notify("Mission: " + m.title);
      G.sound.missionStart();
    },
    objective(G) {
      if (this.side) return this.sideObjective(G);
      if (this.storyDone) return { x: 980, y: 1560, label: "Free roam: side work at the fixer, the chop shop and the marinas." };
      const m = STORY[this.storyIndex];
      if (!m) return null;
      if (this.phase === "offer") return { x: m.from.x, y: m.from.y, label: "Meet the fixer crew: " + m.title + " — " + m.text };
      if (m.type === "tour") {
        const s = m.stops[this.stopIndex];
        return { x: s.x, y: s.y, label: m.title + ": stop " + (this.stopIndex + 1) + " of " + m.stops.length };
      }
      if (this.phase === "go") return { x: m.from.x, y: m.from.y, label: m.title + ": reach the marker" };
      return { x: m.to.x, y: m.to.y, label: m.title + ": deliver to the marker" };
    },
    sideObjective(G) {
      const s = this.side;
      if (s.stage === "go") return { x: s.from.x, y: s.from.y, label: s.label + ": reach the marker" };
      return { x: s.to.x, y: s.to.y, label: s.label + ": deliver" };
    },
  };
}

// Repeat warnings ("you need a car") at most once every few seconds.
function complain(G, text) {
  if (G.time - (G.missions.complainT || 0) > 3.5) {
    G.missions.complainT = G.time;
    G.notify(text);
  }
}

function completeStory(G) {
  const M = G.missions;
  const m = STORY[M.storyIndex];
  let reward = m.reward;
  if (m.type === "steal" && M.targetVehicle) {
    const dmg = M.startHp - M.targetVehicle.hp;
    if (dmg <= 2) { reward += 120; G.notify("Undamaged bonus +$120"); }
  }
  G.player.cash += reward;
  G.notify(m.title + " complete. +$" + reward);
  G.sound.missionDone();
  G.logEvent("Completed " + m.title + " for $" + reward);
  M.storyIndex++;
  M.phase = "offer";
  M.cargo = false;
  M.exposure = 0;
  M.targetVehicle = null;
  if (M.storyIndex >= STORY.length) {
    M.storyDone = true;
    G.notify("Season complete. Vera bought her way out — the Keys are yours now.");
  }
  G.saveSoon = true;
}

function failMission(G, why) {
  const M = G.missions;
  G.notify("Mission failed: " + why + " Talk to the fixer to retry.");
  M.phase = "offer";
  M.cargo = false;
  M.exposure = 0;
  if (M.targetVehicle) { M.targetVehicle.targetCar = false; M.targetVehicle = null; }
  M.side = null;
}

// Side work generators, offered at their home POIs.
export function offerSideWork(G, kind) {
  const M = G.missions;
  if (M.side) { G.notify("Finish the current side job first."); return; }
  const p = G.player;
  if (kind === "stealboard") {
    let best = null; let bd = Infinity;
    for (const v of G.vehicles) {
      if (v.kind !== "car" || v.driver) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return;
    best.targetCar = true;
    best.name = TARGET_NAMES[Math.floor(Math.random() * TARGET_NAMES.length)];
    M.side = { kind, stage: "go", from: { x: best.x, y: best.y }, to: { x: 3380, y: 760 }, vehicle: best, startHp: best.hp, label: "Steal to order: " + best.name, reward: 180 };
    G.notify("Board job: lift the " + best.name + " for the Mire Chop Shop.");
  } else if (kind === "smuggle") {
    M.side = { kind, stage: "go", from: { x: 620, y: 1980 }, to: { x: 3080, y: 1010 }, label: "Smuggling run", reward: 260 };
    M.exposure = 0;
    G.notify("Smuggling: pick up cargo at Brisa Marina, deliver to Norte Marina. Stay unseen.");
  } else if (kind === "fare") {
    M.side = { kind, stage: "go", from: { x: 3180, y: 2880 }, to: { x: 620, y: 1980 }, label: "Boat fare", reward: 150, time: 150 };
    G.notify("A fare waits at Fortuna Marina. Take them by boat to Brisa Marina.");
  }
  G.sound.missionStart();
}

export function updateMissions(G, dt) {
  const M = G.missions;
  const p = G.player;
  const obj = M.objective(G);
  G.objective = obj;
  // Smuggling exposure: being seen by the patrol fills the meter.
  const smuggling = (M.side && M.side.kind === "smuggle" && M.side.stage === "carry")
    || (M.phase === "carry" && STORY[M.storyIndex] && STORY[M.storyIndex].type === "boat");
  G.smuggling = !!smuggling;
  if (smuggling) {
    M.exposure += dt * (G.police.seen ? 0.055 : 0.008);
    if (M.exposure >= 1) { failMission(G, "the cargo was exposed."); return; }
  }
  if (M.side && M.side.time) {
    M.side.time -= dt;
    if (M.side.time <= 0) { failMission(G, "out of time."); return; }
  }
  if (!M.storyDone && M.phase !== "offer") {
    M.timer -= dt;
    if (M.timer <= 0) { failMission(G, "out of time."); return; }
  }
  if (!obj) return;
  const d = Math.hypot(p.x - obj.x, p.y - obj.y);
  // Side work flow.
  if (M.side) {
    const s = M.side;
    if (s.stage === "go" && d < 60) {
      if (s.kind === "stealboard") {
        if (p.inVehicle === s.vehicle) {
          s.stage = "carry";
          G.notify("Got it. To the chop shop — keep it clean.");
        }
      } else if (s.kind === "smuggle") {
        s.stage = "carry";
        G.notify("Cargo aboard. The exposure meter is live.");
      } else if (s.kind === "fare") {
        if (p.inVehicle && p.inVehicle.kind === "boat") {
          s.stage = "carry";
          G.notify("Fare aboard. Brisa Marina, quick and smooth.");
        } else complain(G, "You need a boat for this fare.");
      }
    } else if (s.stage === "carry" && d < 70) {
      if (s.kind === "stealboard" && p.inVehicle !== s.vehicle) return;
      if (s.kind === "fare" && !(p.inVehicle && p.inVehicle.kind === "boat")) return;
      let reward = s.reward;
      if (s.kind === "stealboard" && s.vehicle.hp >= s.startHp - 2) { reward += 60; G.notify("Clean delivery bonus +$60"); }
      if (s.vehicle) s.vehicle.targetCar = false;
      p.cash += reward;
      G.notify(s.label + " done. +$" + reward);
      G.sound.missionDone();
      M.side = null;
      M.exposure = 0;
      G.saveSoon = true;
    }
    return;
  }
  if (M.storyDone) return;
  const m = STORY[M.storyIndex];
  if (M.phase === "offer") {
    if (d < 60 && !p.inVehicle) {
      M.startStory(G);
    }
    return;
  }
  if (m.type === "tour") {
    if (d < 80) {
      M.stopIndex++;
      G.sound.pickup();
      if (M.stopIndex >= m.stops.length) completeStory(G);
      else G.notify("Stop reached. Next marker is up.");
    }
    return;
  }
  if (M.phase === "go" && d < 64) {
    if (m.type === "deliver" && !p.inVehicle) { complain(G, "You need a car for this run."); return; }
    if (m.type === "steal") {
      if (p.inVehicle === M.targetVehicle) { M.phase = "carry"; G.notify("Lifted. Now the chop shop."); }
      return;
    }
    if (m.type === "boat" && !(p.inVehicle && p.inVehicle.kind === "boat")) { complain(G, "The cargo goes by boat."); return; }
    if (m.type === "escape") {
      M.phase = "carry";
      G.notify("It is a setup. Lose the patrol.");
      return;
    }
    M.phase = "carry";
    M.cargo = true;
    G.sound.pickup();
    G.notify("Package aboard. Deliver it.");
    if (m.heat) G.police.addCrime(G, m.heat, "Casino cash lifted");
    return;
  }
  if (M.phase === "carry") {
    if (m.type === "escape") {
      if (G.police.stars < 1 && G.police.heat < 0.9) completeStory(G);
      return;
    }
    if (d < 76) {
      if (m.type === "steal" && p.inVehicle !== M.targetVehicle) { G.notify("Bring the marked car itself."); return; }
      if (m.type === "boat" && !(p.inVehicle && p.inVehicle.kind === "boat")) { G.notify("Arrive by boat."); return; }
      completeStory(G);
    }
  }
  // Cargo in open water draws patrol attention.
  if (M.cargo && isWater(p.x, p.y) && Math.random() < dt * 0.1) {
    G.police.addCrime(G, 0.2, "Cargo run spotted");
  }
}
