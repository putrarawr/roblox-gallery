#!/usr/bin/env bash
set -e

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

if [ ! -d "$PROJECT_DIR/daemon/venv" ]; then
    echo "Creating Python virtualenv..."
    python3 -m venv "$PROJECT_DIR/daemon/venv"
    "$PROJECT_DIR/daemon/venv/bin/pip" install -r "$PROJECT_DIR/daemon/requirements.txt"
fi

echo "=========================================================="
echo "    Roblox Cross-Platform Sync Gallery - Desktop Daemon"
echo "=========================================================="
echo "🎯 Target Cloud : Railway + Supabase Storage"
echo "⌨️  Shortcut     : F12 (Gaming key) / Wayland grim"
echo "Tekan Ctrl+C untuk berhenti."
echo "=========================================================="

"$PROJECT_DIR/daemon/venv/bin/python3" "$PROJECT_DIR/daemon/daemon.py" "$@"
