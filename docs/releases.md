# Releases & signing keys

How a Peek release is produced, what each key is for, and how to recover when one breaks.

## TL;DR — cutting a release

```nu
yarn release 2.0.4   # bumps package.json + Cargo.toml + Cargo.lock, commits, tags v2.0.4, pushes
```

The `v2.0.4` tag fires `.github/workflows/build-macos.yml`, which builds, signs, notarizes, generates `latest.json`, and **publishes** a GitHub Release with these assets:

| Asset                                     | Purpose                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| `Peek_<version>_aarch64.dmg`              | Primary distribution — what new users download.                                     |
| `Peek.app.zip`                            | A `ditto`-zipped, DMG-extracted bundle. Used for direct install / artifact testing. |
| `Peek.app.tar.gz` + `Peek.app.tar.gz.sig` | The auto-updater payload + minisign signature.                                      |
| `latest.json`                             | Updater manifest — endpoint that running apps poll on launch.                       |

Existing installs check `https://github.com/damoonrashidi/peek/releases/latest/download/latest.json` on every launch and prompt the user to update if the manifest version is higher than the running version.

## The two distinct keys

Two completely separate signing systems are involved. They don't know about each other.

### 1. Apple Developer ID (codesign + notarization)

Required for **macOS to launch the app at all** without "is damaged" / Gatekeeper rejection. Set up once in Step 1 of `GITHUB_ACTIONS_SETUP.md`.

GitHub secrets (already populated):

- `APPLE_CERTIFICATE` — base64 of the .p12
- `APPLE_CERTIFICATE_PASSWORD` — the .p12 export password
- `APPLE_API_KEY_ID` — App Store Connect API Key ID (short alphanumeric)
- `APPLE_API_ISSUER_ID` — issuer UUID
- `APPLE_API_KEY` — base64 of the `.p8` file (the workflow decodes this back to a file at build time)

`APPLE_ID` and `APPLE_PASSWORD` are leftover from password-auth notarization and are unused.

### 2. Tauri updater key (minisign)

Required for **Tauri's auto-updater** to trust an update bundle. This is a minisign keypair generated independently of Apple. Without it, the app refuses any download from `latest.json`.

GitHub secrets:

- `TAURI_SIGNING_PRIVATE_KEY` — the _base64 encoding of_ `~/.tauri/peek.key`'s contents (see gotcha below)
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the password set when running `cargo tauri signer generate`

Public counterpart: hardcoded into `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`. The pubkey is meant to be public; only the private key + its password need protecting.

## Generating the updater keypair

```nu
cargo install tauri-cli --version "^2"   # if missing
cargo tauri signer generate -w ~/.tauri/peek.key
# pick a strong password when prompted
```

Outputs:

- `~/.tauri/peek.key` — encrypted private key (DO NOT commit, DO NOT paste anywhere)
- `~/.tauri/peek.key.pub` — public key (single line of base64; commit into `tauri.conf.json`)

Set the secrets — **the private key MUST be base64-encoded with no line wrapping** (see gotcha):

```nu
^openssl base64 -A -in ~/.tauri/peek.key | gh secret set TAURI_SIGNING_PRIVATE_KEY --env default --repo damoonrashidi/peek
gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD --env default --repo damoonrashidi/peek   # interactive prompt
```

Paste the contents of `~/.tauri/peek.key.pub` into `src-tauri/tauri.conf.json` at `plugins.updater.pubkey`, commit.

### Verifying the keypair locally

Before re-running CI, sanity-check the keypair + password are good:

```nu
hide-env TAURI_SIGNING_PRIVATE_KEY   # if it's set in your shell
"test" | save -f /tmp/anything.txt
cargo tauri signer sign --private-key-path ~/.tauri/peek.key --password "<your-password>" /tmp/anything.txt
```

If it produces `/tmp/anything.txt.sig`, the keypair is valid. Any CI failure after that is purely a secret-encoding issue.

## Gotcha: base64 line wrapping

macOS `base64 -i file` wraps output at 76 chars. After round-tripping through GitHub Secrets, those internal newlines confuse Tauri's minisign parser and you get errors like:

- `failed to decode base64 secret key: Invalid symbol 46, offset 21` — secret was set as raw key contents (not base64-encoded at all). The "untrusted comment:" header is not valid base64.
- `incorrect updater private key password: Missing encoded key in secret key` — secret was base64-encoded _with_ line wrapping. The wrapper mistakenly reports it as a password issue, but the real cause is a mangled key file post-decode.

**Always set the private key with `openssl base64 -A` (the `-A` is "single line, no wrapping"):**

```nu
^openssl base64 -A -in ~/.tauri/peek.key | gh secret set TAURI_SIGNING_PRIVATE_KEY --env default --repo damoonrashidi/peek
```

`base64 -i file | tr -d '\n'` works equivalently if you don't have openssl handy.

## Rotating the updater keypair

When you rotate the key (forgotten password, key exfiltration, etc.), **all currently-installed app versions stop accepting updates** because they're pinned to the previous pubkey. Users would need to manually download the new version from the GitHub Releases page once.

Steps:

1. `^rm ~/.tauri/peek.key ~/.tauri/peek.key.pub`
2. `cargo tauri signer generate -w ~/.tauri/peek.key`
3. Re-set both GitHub secrets (private key with the openssl command above, password via interactive `gh secret set`).
4. Replace `pubkey` in `src-tauri/tauri.conf.json` with the new `~/.tauri/peek.key.pub` contents.
5. Commit, then `yarn release <next-version>`.

There is no recovery path for a forgotten minisign passphrase — rotation is the only option.

## What `yarn release <version>` does

Defined in `scripts/release.mjs`. Refuses to run unless:

- A version arg is supplied and is bare semver (`2.0.4`, no `v` prefix).
- The working tree is clean.
- The current branch is `main`.
- The tag doesn't already exist locally or on `origin`.

Then it:

1. Updates the `version` field in `package.json`.
2. Updates the `version` line in `src-tauri/Cargo.toml`.
3. Updates the `[[package]] name = "peek"` block's version in `src-tauri/Cargo.lock`.
4. `git add`s those three files, commits as `Release v<version>`, tags `v<version>`, pushes both `main` and the tag.

`tauri.conf.json` reads its version from `package.json` via `"version": "../package.json"`, so it doesn't need a separate bump.

## What the workflow does

`.github/workflows/build-macos.yml`, on `v*` tag push:

1. **Tag/version guard** — fails if `${GITHUB_REF_NAME#v}` doesn't match `package.json`'s version.
2. **Cert import** — decodes `APPLE_CERTIFICATE` into a temporary keychain.
3. **Build** — `yarn tauri build --target aarch64-apple-darwin`. Tauri signs, notarizes via App Store Connect API key, staples the ticket, and emits the updater tarball + .sig (because `bundle.createUpdaterArtifacts: true` is set).
4. **Verify** — mounts the DMG, copies the `.app` out with `ditto`, then runs `codesign --verify`, `spctl -a -vvv -t exec`, `xcrun stapler validate` on both `.app` and `.dmg`. Verifying the DMG-internal copy avoids a post-processing bug in Tauri's DMG bundler that breaks the seal on the standalone bundle in `bundle/macos/`.
5. **Zip** — `ditto -c -k --sequesterRsrc --keepParent` on the verified `.app` (the upload-artifact zipper would otherwise mangle symlinks/xattrs and break the signature).
6. **Generate `latest.json`** — reads the `.sig` content, builds the manifest with the version from `GITHUB_REF_NAME`, points the URL at the GitHub release download path.
7. **Publish release** — `softprops/action-gh-release@v2` with `draft: false` and `generate_release_notes: true`. Attaches DMG, `.app.zip`, `.app.tar.gz`, `.app.tar.gz.sig`, `latest.json`.

## Troubleshooting

| Symptom                                                                     | Likely cause                                                                                                                                                                               |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `failed to decode base64 secret key: Invalid symbol …`                      | `TAURI_SIGNING_PRIVATE_KEY` was set as raw key file contents. Re-set with `openssl base64 -A`.                                                                                             |
| `incorrect updater private key password: Missing encoded key in secret key` | `TAURI_SIGNING_PRIVATE_KEY` was base64-encoded with line wrapping. Re-set with `openssl base64 -A` (or pipe through `tr -d '\n'`).                                                         |
| `incorrect updater private key password: Wrong password for that key`       | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` doesn't match the password used at `cargo tauri signer generate`. Either re-set it correctly, or [rotate the keypair](#rotating-the-updater-keypair). |
| `code has no resources but signature indicates they must be present`        | Verifying the standalone `bundle/macos/Peek.app` instead of the DMG-internal one. The verify step already does the right thing — if you see this, something has been edited.               |
| `Tag v… does not match package.json version …`                              | You tagged manually with the wrong version, or `package.json` wasn't bumped. Always use `yarn release` rather than `git tag` directly.                                                     |
| App on a user machine says "Peek.app is damaged"                            | DMG was extracted via Finder unzip rather than Disk-Utility-mounted. Distribute the DMG, not the `.app.zip` artifact, to end users.                                                        |

## See also

- `GITHUB_ACTIONS_SETUP.md` — Apple Developer ID setup (one-time).
- `.github/workflows/build-macos.yml` — the workflow itself.
- `scripts/release.mjs` — the release script.
- `src-tauri/tauri.conf.json` — bundle config + updater pubkey + endpoint.
- `src/updater/` — the in-app update check + dialog.
