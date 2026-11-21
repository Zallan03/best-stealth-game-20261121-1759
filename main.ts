import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore - supplied by the make.fun runtime beside this entry.
import { buildDossier } from "./vendor/makefun-game.ts";

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyDirectory(name: string, root: string, outputDir: string): Promise<void> {
  const source = path.join(root, name);
  const destination = path.join(outputDir, name);
  if (await exists(source)) {
    await cp(source, destination, { recursive: true, force: true });
  } else {
    await mkdir(destination, { recursive: true });
    console.warn(`Warning: ${source} was not present; created empty ${destination}.`);
  }
}

async function main(): Promise<void> {
  const root = path.dirname(fileURLToPath(import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

  await mkdir(outputDir, { recursive: true });
  await copyDirectory("game", root, outputDir);
  await copyDirectory("screenshots", root, outputDir);

  const limits = {
    text_max_bytes: 163840,
    screenshots: {
      max: 4,
      max_bytes: 262144,
    },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  };

  // This kit's vendor lib takes buildDossier(outputDir, options) — the output
  // dir comes first, then the entry options object.
  const dossier = await buildDossier(outputDir, {
    title: "Lantern Fox — Steal the Moon-Pearl",
    name: "Lantern Fox — Steal the Moon-Pearl",
    slug: "lantern-fox-steal-the-moon-pearl",
    genre: "stealth",
    description:
      "A tiny Canvas 2D stealth heist. Play a quick orange fox, avoid the Lantern Keepers' vision cones, hide in moon-bushes, prowl with Shift, steal the Moon-Pearl from its shrine, and escape through the north-east gate.",
    instructions:
      "WASD or arrow keys to move. Hold Shift to prowl more quietly. Hide in green moon-bushes unless a keeper gets very close. Fill no keeper's alert meter, steal the pearl, then reach the north-east gate. Press R to restart; click or press Enter to start.",
    howToPlay:
      "WASD / Arrows move, Shift prowls, R restarts, Enter or click starts. Avoid vision cones, hide in bushes, steal the Moon-Pearl, and escape through the north-east gate.",
    gameDir: path.join(outputDir, "game"),
    gamePath: path.join(outputDir, "game"),
    screenshotDir: path.join(outputDir, "screenshots"),
    screenshotsDir: path.join(outputDir, "screenshots"),
    outputDir,
    limits,
    caps: limits,
    text_max_bytes: limits.text_max_bytes,
    screenshots_max: limits.screenshots.max,
    screenshots_max_bytes: limits.screenshots.max_bytes,
    game_max_files: limits.game_max_files,
    game_max_bytes: limits.game_max_bytes,
    game_path_max_bytes: limits.game_path_max_bytes,
  });

  // buildDossier returns the dossier as canonical JSON bytes (a Buffer), so
  // write those bytes verbatim instead of stringifying them.
  const dossierPath = path.join(outputDir, "dossier.json");
  await writeFile(dossierPath, dossier);
  console.log(`Wrote ${dossierPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
