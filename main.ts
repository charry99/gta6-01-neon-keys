// Neon Keys entrypoint for make.fun (gta6-01).
// Copies the game and its screenshots into the output directory and
// writes the dossier the scorer expects, byte for byte deterministic.

import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const here = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

mkdirSync(outputDir, { recursive: true });
cpSync(join(here, "game"), join(outputDir, "game"), { recursive: true });
cpSync(join(here, "screenshots"), join(outputDir, "screenshots"), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, "dossier.json"), dossier);
console.log("Neon Keys handed in to " + outputDir);
