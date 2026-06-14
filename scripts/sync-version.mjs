#!/usr/bin/env node

/**
 * Syncs the release version across all project files.
 * Called by release-it as an after:bump hook.
 * Usage: node scripts/sync-version.mjs <version>
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const version = process.argv[2]
if (!version) {
  console.error('Usage: node scripts/sync-version.mjs <version>')
  process.exit(1)
}

console.log(`Syncing version ${version} across project files...`)

// 1. Sync Cargo.toml
const cargoPath = resolve(root, 'src-tauri', 'Cargo.toml')
let cargoContent = readFileSync(cargoPath, 'utf-8')
cargoContent = cargoContent.replace(
  /^version = "[\d.]+"/m,
  `version = "${version}"`
)
writeFileSync(cargoPath, cargoContent)
console.log('  ✓ src-tauri/Cargo.toml')

// 2. Sync tauri.conf.json
const tauriConfPath = resolve(root, 'src-tauri', 'tauri.conf.json')
const tauriConf = JSON.parse(readFileSync(tauriConfPath, 'utf-8'))
tauriConf.version = version
writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n')
console.log('  ✓ src-tauri/tauri.conf.json')

console.log(`Version ${version} synced across all files.`)
