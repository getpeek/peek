#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = process.argv[2];

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function gitInherit(...args) {
  execFileSync("git", args, { cwd: root, stdio: "inherit" });
}

if (!version) {
  fail("usage: yarn release <version>   e.g. yarn release 2.0.3");
}
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(version)) {
  fail(`invalid version "${version}" — expected semver like 2.0.3 (no leading v).`);
}

const tag = `v${version}`;

if (git("status", "--porcelain") !== "") {
  fail("working tree is not clean. Commit or stash changes first.");
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") {
  fail(`releases must be cut from main; you're on ${branch}.`);
}

try {
  execFileSync("git", ["rev-parse", "--verify", tag], { cwd: root, stdio: "ignore" });
  fail(`tag ${tag} already exists locally.`);
} catch {
  // good — tag doesn't exist
}

git("fetch", "origin", "--tags");
const remoteTags = git("ls-remote", "--tags", "origin", tag);
if (remoteTags !== "") {
  fail(`tag ${tag} already exists on origin.`);
}

const pkgPath = resolve(root, "package.json");
const cargoTomlPath = resolve(root, "src-tauri/Cargo.toml");
const cargoLockPath = resolve(root, "src-tauri/Cargo.lock");

const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const previous = pkg.version;
pkg.version = version;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const cargoToml = readFileSync(cargoTomlPath, "utf8");
const updatedCargoToml = cargoToml.replace(/^version = "[^"]*"$/mu, `version = "${version}"`);
if (updatedCargoToml === cargoToml) {
  fail("could not find a version line in src-tauri/Cargo.toml.");
}
writeFileSync(cargoTomlPath, updatedCargoToml);

// Update only the [[package]] block whose name = "peek" — leave dependency versions alone.
const cargoLock = readFileSync(cargoLockPath, "utf8");
const lockBlockPattern = /(\[\[package\]\]\nname = "peek"\nversion = ")[^"]*(")/u;
const updatedCargoLock = cargoLock.replace(lockBlockPattern, `$1${version}$2`);
if (updatedCargoLock === cargoLock) {
  fail("could not find peek package entry in src-tauri/Cargo.lock.");
}
writeFileSync(cargoLockPath, updatedCargoLock);

console.log(`Bumping ${previous} → ${version}`);

gitInherit("add", "package.json", "src-tauri/Cargo.toml", "src-tauri/Cargo.lock");
gitInherit("commit", "-m", `Release ${tag}`);
gitInherit("tag", tag);
gitInherit("push", "origin", "main");
gitInherit("push", "origin", tag);

console.log(`\nReleased ${tag}. The build-macos workflow will publish the GitHub release.`);
