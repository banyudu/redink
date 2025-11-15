#!/bin/bash

# Redink Installation Helper for macOS
# This script helps bypass macOS Gatekeeper for unsigned apps

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           Redink Installation Helper for macOS            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

echo -e "${YELLOW}This helper will fix the macOS Gatekeeper error:${NC}"
echo -e "${RED}\"Redink is damaged and can't be opened\"${NC}\n"

echo -e "${BLUE}This happens because Redink is not notarized with Apple.${NC}"
echo -e "${BLUE}The app is safe to use - this is just a security warning.${NC}\n"

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}✗ This script is only for macOS${NC}\n"
    exit 1
fi

# Function to find Redink.app
find_redink_app() {
    local locations=(
        "/Applications/Redink.app"
        "$HOME/Applications/Redink.app"
        "$(dirname "$0")/../Redink.app"
        "$HOME/Downloads/Redink.app"
    )
    
    for location in "${locations[@]}"; do
        if [ -d "$location" ]; then
            echo "$location"
            return 0
        fi
    done
    
    return 1
}

# Find DMG files in Downloads
find_redink_dmg() {
    find "$HOME/Downloads" -name "Redink*.dmg" -maxdepth 1 2>/dev/null | head -1
}

echo -e "${YELLOW}Step 1: Checking for Redink files...${NC}\n"

# Look for DMG
DMG_PATH=$(find_redink_dmg)
if [ -n "$DMG_PATH" ]; then
    echo -e "${GREEN}✓ Found DMG: ${DMG_PATH}${NC}"
    echo -e "${YELLOW}  Removing quarantine from DMG...${NC}"
    xattr -cr "$DMG_PATH" 2>/dev/null || true
    echo -e "${GREEN}  ✓ DMG quarantine removed${NC}\n"
fi

# Look for installed app
APP_PATH=$(find_redink_app)
if [ -n "$APP_PATH" ]; then
    echo -e "${GREEN}✓ Found Redink.app: ${APP_PATH}${NC}\n"
else
    echo -e "${YELLOW}⚠ Redink.app not found in common locations${NC}"
    echo -e "${YELLOW}  Please install Redink first by:${NC}"
    echo -e "${YELLOW}  1. Opening the DMG file${NC}"
    echo -e "${YELLOW}  2. Dragging Redink to Applications folder${NC}\n"
    
    read -p "Press Enter after installing, or Ctrl+C to exit..."
    echo ""
    
    APP_PATH=$(find_redink_app)
    if [ -z "$APP_PATH" ]; then
        echo -e "${RED}✗ Still can't find Redink.app${NC}"
        echo -e "${YELLOW}Please specify the path manually:${NC}"
        read -p "Path to Redink.app: " APP_PATH
        
        if [ ! -d "$APP_PATH" ]; then
            echo -e "${RED}✗ Path not found: $APP_PATH${NC}\n"
            exit 1
        fi
    fi
fi

echo -e "${YELLOW}Step 2: Removing macOS quarantine attributes...${NC}\n"

# Check current attributes
ATTRS=$(xattr "$APP_PATH" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ATTRS" -gt 0 ]; then
    echo -e "${YELLOW}Current quarantine attributes found:${NC}"
    xattr -l "$APP_PATH" 2>/dev/null | sed 's/^/  /'
    echo ""
fi

# Remove quarantine
if xattr -cr "$APP_PATH" 2>/dev/null; then
    echo -e "${GREEN}✓ Successfully removed quarantine attributes${NC}\n"
else
    echo -e "${RED}✗ Failed to remove quarantine attributes${NC}"
    echo -e "${YELLOW}Trying with elevated permissions...${NC}\n"
    sudo xattr -cr "$APP_PATH"
    echo -e "${GREEN}✓ Successfully removed quarantine attributes (with sudo)${NC}\n"
fi

# Verify
ATTRS_AFTER=$(xattr "$APP_PATH" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ATTRS_AFTER" -eq 0 ]; then
    echo -e "${GREEN}✓ Verification: No quarantine attributes remaining${NC}\n"
else
    echo -e "${YELLOW}⚠ Some attributes still present (this is usually OK):${NC}"
    xattr -l "$APP_PATH" 2>/dev/null | sed 's/^/  /'
    echo ""
fi

echo -e "${YELLOW}Step 3: Checking code signature...${NC}\n"

# Check signature
if codesign -dv "$APP_PATH" 2>&1 | grep -q "adhoc"; then
    echo -e "${GREEN}✓ App is ad-hoc signed (expected for unsigned apps)${NC}\n"
elif codesign -vv "$APP_PATH" 2>&1 | grep -q "valid on disk"; then
    echo -e "${GREEN}✓ App is properly signed${NC}\n"
else
    echo -e "${YELLOW}⚠ App signature status unclear (usually not a problem)${NC}\n"
fi

# Success
echo -e "${GREEN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║                    ✓ Setup Complete!                      ║
║                                                           ║
║            Redink should now open without errors          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}\n"

# Offer to open
echo -e "${CYAN}Would you like to open Redink now?${NC}"
read -p "Open Redink? (Y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${BLUE}You can open Redink anytime from Applications folder${NC}\n"
else
    echo -e "${BLUE}Opening Redink...${NC}\n"
    open "$APP_PATH"
    
    sleep 2
    echo -e "${GREEN}If Redink opened successfully, you're all set!${NC}"
    echo -e "${YELLOW}If you still see an error, try:${NC}"
    echo -e "  1. System Settings > Privacy & Security"
    echo -e "  2. Click 'Open Anyway' next to Redink warning\n"
fi

echo -e "${CYAN}Thank you for using Redink!${NC}\n"

