#!/bin/bash

# Icon generation script for ZenGarden app
# Generates icons for Electron (Desktop) and Android (Mobile) platforms

SOURCE_ICON="public/icon-512x512.png"

if [ ! -f "$SOURCE_ICON" ]; then
    echo "❌ Source icon not found at $SOURCE_ICON"
    exit 1
fi

echo "Starting icon generation from $SOURCE_ICON"

# ============================================
# Electron Icons (macOS .icns)
# ============================================
echo "Generating Electron icons..."

# Create iconset directory
mkdir -p build/icon.iconset

# Generate all required macOS icon sizes
sips -z 16 16 "$SOURCE_ICON" --out build/icon.iconset/icon_16x16.png > /dev/null
sips -z 32 32 "$SOURCE_ICON" --out build/icon.iconset/icon_16x16@2x.png > /dev/null
sips -z 32 32 "$SOURCE_ICON" --out build/icon.iconset/icon_32x32.png > /dev/null
sips -z 64 64 "$SOURCE_ICON" --out build/icon.iconset/icon_32x32@2x.png > /dev/null
sips -z 128 128 "$SOURCE_ICON" --out build/icon.iconset/icon_128x128.png > /dev/null
sips -z 256 256 "$SOURCE_ICON" --out build/icon.iconset/icon_128x128@2x.png > /dev/null
sips -z 256 256 "$SOURCE_ICON" --out build/icon.iconset/icon_256x256.png > /dev/null
sips -z 512 512 "$SOURCE_ICON" --out build/icon.iconset/icon_256x256@2x.png > /dev/null
sips -z 512 512 "$SOURCE_ICON" --out build/icon.iconset/icon_512x512.png > /dev/null
sips -z 1024 1024 "$SOURCE_ICON" --out build/icon.iconset/icon_512x512@2x.png > /dev/null

# Convert iconset to .icns file
iconutil -c icns build/icon.iconset -o build/icon.icns

echo "✓ Electron macOS icons generated (icon.icns)"

# ============================================
# Android Icons (uses separate source icon)
# ============================================
echo "Generating Android icons..."

ANDROID_ICON="public/icon-android.png"

if [ ! -f "$ANDROID_ICON" ]; then
    echo "Android source icon not found at $ANDROID_ICON, falling back to $SOURCE_ICON"
    ANDROID_ICON="$SOURCE_ICON"
fi

# Remove default Android robot vector drawable that overrides PNG icons
rm -f android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml

# mdpi (48x48)
sips -z 48 48 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-mdpi/ic_launcher.png > /dev/null
sips -z 48 48 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png > /dev/null
sips -z 108 108 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png > /dev/null

# hdpi (72x72)
sips -z 72 72 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-hdpi/ic_launcher.png > /dev/null
sips -z 72 72 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png > /dev/null
sips -z 162 162 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png > /dev/null

# xhdpi (96x96)
sips -z 96 96 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xhdpi/ic_launcher.png > /dev/null
sips -z 96 96 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png > /dev/null
sips -z 216 216 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png > /dev/null

# xxhdpi (144x144)
sips -z 144 144 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png > /dev/null
sips -z 144 144 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png > /dev/null
sips -z 324 324 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png > /dev/null

# xxxhdpi (192x192)
sips -z 192 192 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png > /dev/null
sips -z 192 192 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png > /dev/null
sips -z 432 432 "$ANDROID_ICON" --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png > /dev/null

echo "✓ Android icons generated"

# Clean Android build cache so new icons are picked up
if [ -d "android/app/build" ]; then
    echo "🧹 Cleaning Android build cache..."
    rm -rf android/app/build
    echo "✓ Android build cache cleared"
fi

echo ""
echo "All icons generated successfully!"
echo ""
echo "Generated icons for:"
echo "  • Electron (macOS) - icon.icns"
echo "  • Android - 5 density variants (mdpi to xxxhdpi) from ${ANDROID_ICON}"
echo ""
echo "Note: Windows Electron icons (.ico) require additional tools."
echo "Consider using electron-builder's icon generation or online converters."
