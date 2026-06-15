import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, ".release-please-manifest.json"), "utf8"));
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const tauriConfig = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));
const cargoToml = readFileSync(join(root, "src-tauri", "Cargo.toml"), "utf8");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const expected = manifest["."];

const versions = {
  ".release-please-manifest.json": expected,
  "package.json": packageJson.version,
  "src-tauri/tauri.conf.json": tauriConfig.version,
  "src-tauri/Cargo.toml": cargoVersion,
};

const mismatches = Object.entries(versions).filter(([, version]) => version !== expected);
if (mismatches.length > 0) {
  console.error("Release baseline version mismatch:");
  for (const [file, version] of mismatches) {
    console.error(`- ${file}: ${version ?? "<missing>"}; expected ${expected}`);
  }
  process.exit(1);
}

const tags = execSync("git tag --list v*", { cwd: root, encoding: "utf8" })
  .split(/\r?\n/)
  .map((tag) => tag.trim())
  .filter(Boolean);
const higherTags = tags.filter((tag) => compareSemver(tag.replace(/^v/, ""), expected) > 0);

if (higherTags.length > 0) {
  console.error(`Local tags are ahead of release baseline ${expected}: ${higherTags.join(", ")}`);
  console.error(
    "Delete stale local-only tags or update the release baseline before running release automation."
  );
  process.exit(1);
}

console.log(`Release baseline is consistent at v${expected}.`);

function compareSemver(left, right) {
  const a = left.split(".").map((part) => Number.parseInt(part, 10));
  const b = right.split(".").map((part) => Number.parseInt(part, 10));
  for (let index = 0; index < 3; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}
