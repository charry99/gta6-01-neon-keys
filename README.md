# gta6-01-neon-keys

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/charry99/gta6-01-neon-keys/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/charry99/gta6-01-neon-keys/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Neon Keys** is an original open-world crime game set at night in the Marisol Keys, a fictional chain of neon-lit islands joined by long causeways over black water. You play Vera Solano, a driver just out of prison, pulled back by the Brisa crew for one season of smuggling runs before she can buy her way out.

The world is three islands — Isla Grande with the port city of Cayo Brisa (Port Brisa docks, the Fortuna Strip casino row, Old Town, Palm Heights), Cayo Norte with the swamp parish of The Mire, and Isla Fortuna with the Aero Key airstrip — generated from a fixed seed, with roads, sidewalks, neon-lit buildings, docks, marinas and beaches. Water is real: a car that goes in is wrecked, and swimming is slow and cold.

What is in the game:

- **On foot and in vehicles.** Walk, sprint and swim; steal and drive cars with acceleration, steering, braking, a handbrake, rain-slick grip and collisions; board speedboats at the marinas and run the open water with drift and a wake.
- **Traffic and pedestrians.** Civilian cars follow the road loops of every island and cross the causeways, keep their distance and honk; pedestrians stroll the sidewalks and flee from gunfire, sirens and fast cars.
- **Wanted level and police.** Zero to five stars. Stealing, hitting pedestrians, shooting and running cargo in sight of a patrol all raise the heat. The Marisol Keys Patrol answers with foot officers, patrol cars and patrol boats, and at four stars a helicopter whose spotlight keeps you seen. Break line of sight to cool off, or pay to lay low at a garage or a safehouse. Get pinned and you are busted; lose your health and you are wasted.
- **Missions and a story.** A six-mission chain from the crew's fixer — a first causeway delivery, a steal-to-order lift, a night boat run, a casino cash pickup under heat, an ambush escape, and a final all-islands run against the clock — plus repeatable side work: a steal-to-order board at the Mire Chop Shop, smuggling runs with a cargo exposure meter that fills while the patrol watches, and boat fares between marinas.
- **Combat and cash.** Fists and a pistol with pickups, rival-crew guards on the cargo, health and armour. Cash is spent at the lay-low garage, the Night Market arms shop, and on two safehouses that save the game, heal Vera and clear her heat.
- **Weather and light.** A slow night cycle from deep night to grey dawn, neon signs and streetlights reflecting on wet streets, and rain storms that roll in off the sea, cut grip and are drawn and sounded. All sound is synthesized live with the Web Audio API: engines, sirens, the helicopter, gunshots, rain and a bass music loop.
- **HUD and saving.** Cash, health, armour, wanted stars, a live minimap with police blips, mission markers, garages, shops and safehouses, the current objective with a distance arrow, the smuggling exposure meter, speed, and an in-game clock. A start screen, pause menu, busted and wasted screens, and saving through local storage.

The game is plain files: vanilla JavaScript modules on a canvas, no libraries, no build step, no network requests.

## Run it

Serve the game locally and open it in a desktop browser:

```
node serve.ts
```

Then open http://localhost:8080 and press Start.

Hand the entry in (writes `game/`, `screenshots/` and `dossier.json` to the output directory):

```
node main.ts
```

Set `MAKEFUN_OUTPUT_DIR` to choose the output directory outside the grader.

---
<sub>Entered on [make.fun](https://make.fun/?ref=1xwqyaf2&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
