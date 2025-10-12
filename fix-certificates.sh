#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔧 Certificate Chain Fix Script for macOS Code Signing"
echo "======================================================="
echo ""

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Step 1: Check for Developer ID Certificate
echo "Step 1: Checking for Developer ID Certificate..."
CERT_CHECK=$(security find-identity -v -p codesigning | grep "Developer ID Application")
if [ -n "$CERT_CHECK" ]; then
    print_status "Found Developer ID Certificate:"
    echo "$CERT_CHECK"
    CERT_HASH=$(echo "$CERT_CHECK" | head -1 | awk '{print $2}')
    CERT_NAME=$(echo "$CERT_CHECK" | head -1 | sed 's/.*"\(.*\)"/\1/')
    echo "  Certificate Hash: $CERT_HASH"
    echo "  Certificate Name: $CERT_NAME"
else
    print_error "No Developer ID Application certificate found!"
    echo "Please create one at https://developer.apple.com/account/resources/certificates/add"
    exit 1
fi
echo ""

# Step 2: Download all required Apple certificates
echo "Step 2: Downloading Apple Root and Intermediate Certificates..."
mkdir -p ~/Downloads/apple-certs
cd ~/Downloads/apple-certs

# Download all necessary certificates
print_status "Downloading Apple Root CA..."
curl -s -o AppleRootCA.cer https://www.apple.com/appleca/AppleIncRootCertificate.cer

print_status "Downloading Apple Root CA-G2..."
curl -s -o AppleRootCA-G2.cer https://www.apple.com/certificateauthority/AppleRootCA-G2.cer

print_status "Downloading Apple Root CA-G3..."
curl -s -o AppleRootCA-G3.cer https://www.apple.com/certificateauthority/AppleRootCA-G3.cer

print_status "Downloading Apple WWDR CA..."
curl -s -o AppleWWDRCA.cer https://developer.apple.com/certificationauthority/AppleWWDRCA.cer

print_status "Downloading Apple WWDR CA G2..."
curl -s -o AppleWWDRCAG2.cer https://www.apple.com/certificateauthority/AppleWWDRCAG2.cer

print_status "Downloading Apple WWDR CA G3..."
curl -s -o AppleWWDRCAG3.cer https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer

print_status "Downloading Developer ID CA..."
curl -s -o DeveloperIDCA.cer https://www.apple.com/certificateauthority/DeveloperIDCA.cer

print_status "Downloading Developer ID G2 CA..."
curl -s -o DeveloperIDG2CA.cer https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer

echo ""

# Step 3: Install all certificates to keychain
echo "Step 3: Installing certificates to keychain..."
for cert in *.cer; do
    print_status "Installing $cert..."
    security add-certificates -k ~/Library/Keychains/login.keychain-db "$cert" 2>/dev/null || print_warning "Certificate may already be installed: $cert"
done
echo ""

# Step 4: Fix keychain access permissions
echo "Step 4: Setting keychain permissions for codesign..."
print_warning "This step requires your macOS password"
echo "Please enter your password when prompted:"

# Try to unlock the keychain first
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Set partition list for codesigning
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "" ~/Library/Keychains/login.keychain-db 2>/dev/null
if [ $? -eq 0 ]; then
    print_status "Keychain permissions updated successfully"
else
    print_warning "Failed to update keychain permissions automatically"
    echo ""
    echo "Please run this command manually and enter your password:"
    echo "security set-key-partition-list -S apple-tool:,apple:,codesign: -s ~/Library/Keychains/login.keychain-db"
fi
echo ""

# Step 5: Verify certificate chain
echo "Step 5: Verifying certificate chain..."
TEST_FILE="/tmp/test_codesign_$$"
echo '#!/bin/bash' > "$TEST_FILE"
chmod +x "$TEST_FILE"

codesign -s "$CERT_NAME" "$TEST_FILE" 2>/tmp/codesign_error_$$
if [ $? -eq 0 ]; then
    print_status "Certificate chain is valid! Code signing successful."
    codesign -dv "$TEST_FILE"
else
    print_error "Certificate chain validation failed:"
    cat /tmp/codesign_error_$$
    echo ""
    print_warning "Additional troubleshooting steps:"
    echo "1. Open Keychain Access app"
    echo "2. Find your 'Developer ID Application' certificate"
    echo "3. Double-click it and expand 'Trust'"
    echo "4. Set 'Code Signing' to 'Always Trust'"
    echo "5. Close and save (enter your password when prompted)"
fi

# Cleanup
rm -f "$TEST_FILE" /tmp/codesign_error_$$
echo ""

# Step 6: Test with Tauri configuration
echo "Step 6: Checking Tauri configuration..."
if [ -f "../src-tauri/tauri.conf.json" ]; then
    cd ..
    CURRENT_IDENTITY=$(grep '"signingIdentity"' src-tauri/tauri.conf.json | sed 's/.*"\(.*\)".*/\1/' | tail -1)
    if [ "$CURRENT_IDENTITY" != "$CERT_NAME" ] && [ "$CURRENT_IDENTITY" != "$CERT_HASH" ]; then
        print_warning "Your tauri.conf.json uses: '$CURRENT_IDENTITY'"
        echo "Consider updating it to one of these:"
        echo "  - \"$CERT_NAME\""
        echo "  - \"$CERT_HASH\""
    else
        print_status "Tauri configuration looks correct"
    fi
else
    print_warning "Could not find src-tauri/tauri.conf.json"
fi
echo ""

# Step 7: Final recommendations
echo "Step 7: Final Steps"
echo "==================="
echo "1. If the certificate chain is still failing, try:"
echo "   - Restart your Mac"
echo "   - Open Keychain Access and manually trust the Developer ID certificate"
echo "   - Ensure Xcode is up to date: xcode-select --install"
echo ""
echo "2. To build your Tauri app:"
echo "   cd src-tauri && cargo tauri build"
echo ""
echo "3. For notarization (required for distribution), set these environment variables:"
echo "   export APPLE_ID=\"your-apple-id@email.com\""
echo "   export APPLE_PASSWORD=\"app-specific-password\"  # Generate at appleid.apple.com"
echo "   export APPLE_TEAM_ID=\"93JGDXCC8N\"  # Your team ID"
echo ""
print_status "Script completed!"
