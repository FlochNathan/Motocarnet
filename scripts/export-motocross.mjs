// Localise Blender (PATH, variable BLENDER, ou emplacements Windows courants)
// puis lance l'export GLB. Permet `npm run 3d:export` sans configurer le PATH.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

function findBlender() {
  // 1. Variable d'environnement explicite
  if (process.env.BLENDER && existsSync(process.env.BLENDER)) return process.env.BLENDER;

  // 2. Sur le PATH
  const probe = spawnSync(process.platform === "win32" ? "where" : "which", ["blender"], { encoding: "utf8" });
  if (probe.status === 0) {
    const first = probe.stdout.split(/\r?\n/).find(Boolean);
    if (first && existsSync(first)) return first;
  }

  // 3. Emplacements d'installation Windows courants (prend la version la plus récente)
  const roots = [
    path.join(process.env["ProgramFiles"] || "C:/Program Files", "Blender Foundation"),
    path.join(process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)", "Blender Foundation"),
    path.join(process.env["LOCALAPPDATA"] || "", "Programs", "Blender Foundation"),
  ].filter(existsSync);
  const candidates = [];
  for (const root of roots) {
    for (const dir of readdirSync(root)) {
      const exe = path.join(root, dir, "blender.exe");
      if (existsSync(exe)) candidates.push(exe);
    }
  }
  candidates.sort().reverse(); // version la plus récente d'abord
  return candidates[0] ?? null;
}

const blender = findBlender();
if (!blender) {
  console.error(
    "\n❌ Blender introuvable.\n" +
      "   Installez-le depuis https://www.blender.org/download/ (ou : winget install BlenderFoundation.Blender)\n" +
      "   puis relancez : npm run 3d:export\n" +
      "   Vous pouvez aussi définir le chemin : set BLENDER=C:\\chemin\\vers\\blender.exe\n",
  );
  process.exit(1);
}

console.log(`Blender : ${blender}`);
const res = spawnSync(blender, ["-b", "Image/moto3d.blend", "-P", "scripts/export-motocross.py"], {
  stdio: "inherit",
});
process.exit(res.status ?? 0);
