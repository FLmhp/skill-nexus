import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { chmod } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import https from "node:https";

const ACTIONLINT_VERSION = "1.7.12";
const __filename = fileURLToPath(import.meta.url);
const root = join(dirname(__filename), "..");

const platform = {
  win32: "windows",
  linux: "linux",
  darwin: "darwin",
}[process.platform];

const arch = {
  x64: "amd64",
  arm64: "arm64",
}[process.arch];

if (!platform || !arch) {
  throw new Error(`Unsupported platform for actionlint: ${process.platform}/${process.arch}`);
}

const cacheDir = join(root, ".cache", "actionlint", ACTIONLINT_VERSION, `${platform}_${arch}`);
const executable = join(cacheDir, process.platform === "win32" ? "actionlint.exe" : "actionlint");
const archiveName = `actionlint_${ACTIONLINT_VERSION}_${platform}_${arch}.${
  process.platform === "win32" ? "zip" : "tar.gz"
}`;
const archivePath = join(cacheDir, archiveName);
const downloadUrl = `https://github.com/rhysd/actionlint/releases/download/v${ACTIONLINT_VERSION}/${archiveName}`;

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

async function main() {
  if (!existsSync(executable)) {
    mkdirSync(cacheDir, { recursive: true });
    if (!existsSync(archivePath)) {
      await download(downloadUrl, archivePath);
    }
    extractArchive(archivePath, cacheDir);
    if (process.platform !== "win32") {
      await chmod(executable, 0o755);
    }
  }

  execFileSync(executable, process.argv.slice(2), {
    cwd: root,
    stdio: "inherit",
  });
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      { headers: { "User-Agent": "SkillNexus-actionlint" } },
      (response) => {
        if (
          response.statusCode &&
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          download(response.headers.location, destination).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Failed to download actionlint: HTTP ${response.statusCode}`));
          return;
        }

        const file = createWriteStream(destination);
        response.pipe(file);
        file.on("close", resolve);
        file.on("error", reject);
      }
    );

    request.on("error", reject);
  });
}

function extractArchive(archive, destination) {
  if (process.platform === "win32") {
    execFileSync("tar", ["-xf", archive, "-C", destination], { stdio: "inherit" });
    return;
  }

  execFileSync("tar", ["-xzf", archive, "-C", destination], { stdio: "inherit" });
}
