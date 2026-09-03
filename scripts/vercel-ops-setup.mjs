import { cpSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const files = [
  "app",
  "components",
  "lib",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "tsconfig.json",
  "next-env.d.ts",
];

for (const file of files) {
  const from = `apps/planner/${file}`;
  if (!existsSync(from)) {
    console.error(`Missing ${from}`);
    process.exit(1);
  }
  cpSync(from, file, { recursive: true });
}

if (existsSync("apps/planner/public")) {
  cpSync("apps/planner/public", "public", { recursive: true });
}

const install = spawnSync("npm", ["install", "--include=dev"], { stdio: "inherit", shell: true });
process.exit(install.status ?? 1);
