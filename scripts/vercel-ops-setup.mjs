import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: true, ...options });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

function exportCommunityPwa() {
  run("npm", ["install", "--include=dev"], { cwd: "apps/community" });
  run("npx", ["next", "build"], {
    cwd: "apps/community",
    env: { ...process.env, NEXT_PUBLIC_BASE_PATH: "/pwa" },
  });

  const from = existsSync("apps/community/out/pwa") ? "apps/community/out/pwa" : "apps/community/out";
  if (!existsSync(from)) {
    console.error("Community export missing", from);
    process.exit(1);
  }

  mkdirSync("public", { recursive: true });
  rmSync("public/pwa", { recursive: true, force: true });
  cpSync(from, "public/pwa", { recursive: true });
  for (const asset of ["logo.svg", "icon.svg"]) {
    const src = `apps/community/public/${asset}`;
    if (existsSync(src)) cpSync(src, `public/${asset}`);
  }
}

exportCommunityPwa();

run("npm", ["install", "--include=dev"]);
