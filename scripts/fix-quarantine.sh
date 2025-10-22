#!/bin/bash

# Script to fix macOS Gatekeeper "app is damaged" error
# This removes quarantine attributes from the built app

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Redink macOS Quarantine Fix ===${NC}\n"

# Default app locations to check
APP_LOCATIONS=(
    "/Applications/Redink.app"
    "$HOME/Applications/Redink.app"
    "src-tauri/target/aarch64-apple-darwin/release/bundle/macos/Redink.app"
    "src-tauri/target/x86_64-apple-darwin/release/bundle/macos/Redink.app"
    "src-tauri/target/release/bundle/macos/Redink.app"
)

# If user provides a path, use that
if [ -n "$1" ]; then
    APP_PATH="$1"
else
    # Find the app
    APP_PATH=""
    echo -e "${YELLOW}Searching for Redink.app...${NC}\n"
    
    for location in "${APP_LOCATIONS[@]}"; do
        if [ -d "$location" ]; then
            APP_PATH="$location"
            echo -e "${GREEN}✓ Found: $APP_PATH${NC}\n"
            break
        fi
    done
    
    if [ -z "$APP_PATH" ]; then
        echo -e "${RED}✗ Could not find Redink.app in common locations.${NC}"
        echo -e "${YELLOW}Please provide the path as an argument:${NC}"
        echo -e "  $0 /path/to/Redink.app\n"
        exit 1
    fi
fi

# Check if path exists
if [ ! -d "$APP_PATH" ]; then
    echo -e "${RED}✗ Path does not exist: $APP_PATH${NC}\n"
    exit 1
fi

# Show current attributes
echo -e "${YELLOW}Current extended attributes:${NC}"
xattr -l "$APP_PATH" 2>/dev/null || echo "  (none)"
echo ""

# Remove quarantine attributes
echo -e "${YELLOW}Removing quarantine attributes...${NC}"
if xattr -cr "$APP_PATH" 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully removed quarantine attributes${NC}\n"
else
    echo -e "${RED}✗ Failed to remove quarantine attributes${NC}"
    echo -e "${YELLOW}Try running with sudo:${NC}"
    echo -e "  sudo $0 \"$APP_PATH\"\n"
    exit 1
fi

# Verify removal
echo -e "${YELLOW}Verifying...${NC}"
REMAINING_ATTRS=$(xattr -l "$APP_PATH" 2>/dev/null | wc -l)
if [ "$REMAINING_ATTRS" -eq 0 ]; then
    echo -e "${GREEN}✓ All quarantine attributes removed${NC}\n"
else
    echo -e "${YELLOW}⚠ Some attributes remain:${NC}"
    xattr -l "$APP_PATH"
    echo ""
fi

# Check code signature
echo -e "${YELLOW}Checking code signature...${NC}"
if codesign -vv "$APP_PATH" 2>&1 | grep -q "valid on disk"; then
    echo -e "${GREEN}✓ App is properly signed${NC}\n"
elif codesign -dv "$APP_PATH" 2>&1 | grep -q "adhoc"; then
    echo -e "${YELLOW}⚠ App uses ad-hoc signing (unsigned)${NC}"
    echo -e "${YELLOW}  This is normal for local builds${NC}\n"
else
    echo -e "${YELLOW}⚠ App is not code signed${NC}"
    echo -e "${YELLOW}  This is normal for local builds${NC}\n"
fi

# Success message
echo -e "${GREEN}=== Done! ===${NC}"
echo -e "${GREEN}You should now be able to open Redink.app${NC}\n"

# Offer to open the app
read -p "Would you like to open Redink now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Opening Redink...${NC}\n"
    open "$APP_PATH"
fi

