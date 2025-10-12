# GitHub Actions Setup for macOS Code Signing

This guide explains how to set up GitHub Actions to build and sign your Tauri app for macOS distribution.

## Prerequisites

1. Apple Developer Account (enrolled in Apple Developer Program)
2. Developer ID Application certificate
3. GitHub repository for your project

## Step 1: Export Your Certificate

On your local Mac where you have the certificate installed:

```bash
# Export your Developer ID Application certificate with private key
security export -t identities -f pkcs12 -k ~/Library/Keychains/login.keychain-db \
  -o ~/Downloads/certificates.p12 -P "YOUR_TEMP_PASSWORD"

# Base64 encode the certificate for GitHub Secrets
base64 -i ~/Downloads/certificates.p12 -o ~/Downloads/certificates_base64.txt

# The contents of certificates_base64.txt will be used in GitHub Secrets
cat ~/Downloads/certificates_base64.txt

# IMPORTANT: Delete these files after adding to GitHub Secrets
rm ~/Downloads/certificates.p12 ~/Downloads/certificates_base64.txt
```

## Step 2: Create GitHub Secrets

Go to your repository on GitHub:
1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add the following secrets:

### Required Secrets

| Secret Name | Description | How to Get It |
|------------|-------------|---------------|
| `APPLE_CERTIFICATE` | Base64 encoded .p12 certificate | Contents of `certificates_base64.txt` from Step 1 |
| `APPLE_CERTIFICATE_PASSWORD` | Password used when exporting the certificate | The password you used in the `-P` flag in Step 1 |
| `APPLE_ID` | Your Apple ID email | Your Apple Developer account email |
| `APPLE_PASSWORD` | App-specific password for notarization | Generate at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords |

### Optional Secrets (for auto-updates)

| Secret Name | Description | How to Get It |
|------------|-------------|---------------|
| `TAURI_PRIVATE_KEY` | Private key for Tauri updater | Generate with `tauri signer generate -w ~/.tauri/myapp.key` |
| `TAURI_KEY_PASSWORD` | Password for the private key | Password you set when generating the key |

## Step 3: Generate App-Specific Password

1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in with your Apple ID
3. Navigate to **Sign-In and Security**
4. Select **App-Specific Passwords**
5. Click the **+** button to generate a new password
6. Name it something like "GitHub Actions Notarization"
7. Copy the generated password (format: `xxxx-xxxx-xxxx-xxxx`)
8. Add it as the `APPLE_PASSWORD` secret in GitHub

## Step 4: Configure Your Tauri App

Ensure your `src-tauri/tauri.conf.json` has the proper configuration:

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "entitlements.plist",
      "hardenedRuntime": true,
      "minimumSystemVersion": "10.13"
    }
  }
}
```

## Step 5: Create Entitlements File

Create `src-tauri/entitlements.plist` if it doesn't exist:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
    <key>com.apple.security.files.user-selected.read-write</key>
    <true/>
</dict>
</plist>
```

## Step 6: Test the Workflow

1. Push to your repository or manually trigger the workflow
2. Check the Actions tab in GitHub to monitor the build
3. Download the artifacts to test the signed app

## Workflows Included

### `build-test.yml`
- Triggered on pushes to main/develop and PRs
- Builds and signs the app
- Uploads artifacts for testing
- Does NOT notarize (faster for testing)

### `build-macos.yml`
- Triggered on version tags (v*)
- Builds universal binary (Intel + Apple Silicon)
- Signs and notarizes the app
- Creates draft release with artifacts

## Triggering a Release Build

```bash
# Create a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the full build pipeline with notarization.

## Troubleshooting

### Certificate Issues

If you see "unable to build chain to self-signed root":
- Ensure you exported the certificate WITH the private key
- Check that the certificate hasn't expired
- Verify the password is correct

### Notarization Failures

Common issues:
- Invalid app-specific password (regenerate it)
- Missing entitlements
- Hardened runtime not enabled
- Binary not signed with Developer ID

### Debugging in GitHub Actions

Add these steps to your workflow for debugging:

```yaml
- name: Debug - List Keychains
  run: security list-keychains

- name: Debug - Find Identities
  run: security find-identity -v -p codesigning

- name: Debug - Check Certificate
  run: |
    security find-certificate -c "Developer ID Application" -p | \
    openssl x509 -text -noout
```

## Security Best Practices

1. **Never commit certificates or passwords to your repository**
2. **Rotate app-specific passwords regularly**
3. **Use environment-specific certificates** (separate for CI/CD vs local development)
4. **Limit secret access** to only necessary workflows
5. **Review workflow changes** in pull requests carefully

## Additional Resources

- [Apple Developer - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Tauri - Code Signing](https://tauri.app/v1/guides/distribution/sign-macos)
- [GitHub - Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support

For issues specific to this project:
- Check the Actions tab for build logs
- Review the workflow files in `.github/workflows/`
- Ensure all secrets are properly configured

For general Tauri/Apple signing issues:
- [Tauri Discord](https://discord.com/invite/tauri)
- [Apple Developer Forums](https://developer.apple.com/forums/)
