#!/usr/bin/env node
/**
 * Builds and zips a Lambda (for manual deploy). CDK uses esbuild instead.
 * Usage: node scripts/package.mjs daily-job
 */
import { createReadStream } from "fs";
import { createWriteStream } from "fs";
import { readdir, mkdir, copyFile } from "fs/promises";
import { pipeline } from "stream/promises";
import { createGzip } from "zlib";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist-lambda");
const name = process.argv[2] || "daily-job";

async function main() {
  await mkdir(outDir, { recursive: true });
  const distDir = join(root, "dist");
  const lambdasDir = join(distDir, "lambdas");
  const sharedDir = join(distDir, "shared");
  const src = join(lambdasDir, name);
  // Copy dist/lambdas/<name>/* and dist/shared/* to outDir (flat or structure)
  // For Lambda we need one folder with handler and node_modules
  console.log("Package script: use CDK to deploy. Run: cd infrastructure && npx cdk deploy");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
