import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/bump-version.mjs <version>');
  console.error('Example: node scripts/bump-version.mjs 0.1.1');
  process.exit(1);
}

if (!/^\d+\.\d+\.\d+/.test(version)) {
  console.error(`Invalid version: "${version}". Must match /^\\d+\\.\\d+\\.\\d+/`);
  process.exit(1);
}

const files = [];

// Update package.json
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const oldVersion = pkg.version;
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
files.push(pkgPath);

// Update tauri.conf.json
const tauriConfPath = join(root, 'src-tauri', 'tauri.conf.json');
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'));
tauriConf.version = version;
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
files.push(tauriConfPath);

// Update Cargo.toml
const cargoPath = join(root, 'src-tauri', 'Cargo.toml');
let cargoToml = readFileSync(cargoPath, 'utf-8');
cargoToml = cargoToml.replace(
  /^version\s*=\s*".*?"$/m,
  `version = "${version}"`
);
writeFileSync(cargoPath, cargoToml);
files.push(cargoPath);

// Git operations
execSync(`git add ${files.join(' ')}`, { cwd: root, stdio: 'inherit' });
execSync(`git commit -m "chore: bump version to v${version}"`, { cwd: root, stdio: 'inherit' });
execSync(`git tag v${version}`, { cwd: root, stdio: 'inherit' });

console.log(`\nVersion bumped from ${oldVersion} to ${version}`);
console.log(`Files updated: package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml`);
console.log(`Commit created: chore: bump version to v${version}`);
console.log(`Tag created: v${version}`);
console.log('\nReady to push: git push origin main && git push origin v' + version);
