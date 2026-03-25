#!/usr/bin/env bash
set -e  # Exit if any command fails

# Check input
if [ -z "$1" ]; then
    echo "Usage: $0 File.c"
    exit 1
fi

FILE="$1"
BASENAME=$(basename "$FILE" .c)

echo
echo "=============================="
echo "   STC8 Flash Automation Tool"
echo "=============================="

# Step 1: Compile
echo
echo "[1/3] Compiling $FILE with SDCC..."
sdcc "$FILE"

# Step 2: Convert IHX -> HEX
echo
echo "[2/3] Converting $BASENAME.ihx to $BASENAME.hex..."
packihx "$BASENAME.ihx" > "$BASENAME.hex"

# Step 3: Activate virtual environment
echo
echo "[3/3] Activating virtual environment..."
source /home/ashinaji/Installs/PythonVenv/venv/bin/activate

# Flash using stcgal
echo
echo "Flashing $BASENAME.hex with stcgal..."
stcgal "$BASENAME.hex"

# Deactivate virtual environment
echo
echo "Deactivating virtual environment..."
deactivate

echo
echo "✅ Done!"
