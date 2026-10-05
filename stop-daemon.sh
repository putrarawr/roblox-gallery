#!/usr/bin/env bash
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$PROJECT_DIR/daemon.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        rm -f "$PID_FILE"
        notify-send -a "Roblox Sync" "Roblox Daemon" "Daemon berhasil dihentikan."
        echo "Daemon (PID $PID) berhasil dihentikan."
        exit 0
    fi
    rm -f "$PID_FILE"
fi

pkill -f "daemon.py" 2>/dev/null || true
echo "Daemon tidak sedang berjalan."
