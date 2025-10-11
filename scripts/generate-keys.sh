#!/bin/bash

# Generate signing keys for Tauri updater
# This script should be run once to generate the key pair

echo "🔐 Generating Tauri updater signing keys..."
echo ""

# Check if keys already exist
if [ -f "$HOME/.tauri/redink.key" ]; then
    echo "⚠️  Keys already exist at $HOME/.tauri/redink.key"
    read -p "Do you want to regenerate them? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborting..."
        exit 0
    fi
fi

# Create .tauri directory if it doesn't exist
mkdir -p "$HOME/.tauri"

# Generate keys using OpenSSL
openssl genpkey -algorithm Ed25519 -out "$HOME/.tauri/redink.key"
openssl pkey -in "$HOME/.tauri/redink.key" -pubout -out "$HOME/.tauri/redink.pub"

# Extract the public key in base64 format for tauri.conf.json
PUBKEY=$(openssl pkey -in "$HOME/.tauri/redink.key" -pubout -outform DER | tail -c 32 | base64)

echo ""
echo "✅ Keys generated successfully!"
echo ""
echo "📁 Private key saved to: $HOME/.tauri/redink.key"
echo "📁 Public key saved to: $HOME/.tauri/redink.pub"
echo ""
echo "🔑 Your public key (base64):"
echo "$PUBKEY"
echo ""
echo "📝 Next steps:"
echo "1. Copy the public key above"
echo "2. Update src-tauri/tauri.conf.json and replace 'YOUR_PUBLIC_KEY_HERE' with this key"
echo "3. Add the private key to GitHub Secrets:"
echo "   - Go to: https://github.com/banyudu/redink/settings/secrets/actions"
echo "   - Add a new secret named: TAURI_SIGNING_PRIVATE_KEY"
echo "   - Value: the content of $HOME/.tauri/redink.key"
echo ""
echo "⚠️  IMPORTANT: Keep your private key secure and never commit it to git!"
echo ""

# Show the private key content for easy copying
echo "Private key content (for GitHub Secret):"
echo "----------------------------------------"
cat "$HOME/.tauri/redink.key"
echo "----------------------------------------"

