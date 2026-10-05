#!/usr/bin/env bash
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PID_FILE="$PROJECT_DIR/daemon.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
        notify-send -a "Roblox Sync" "Roblox Daemon" "Daemon sudah berjalan di background (PID $PID)"
        echo "Daemon sudah berjalan (PID $PID)"
        exit 0
    fi
fi

# Run daemon in background
nohup "$PROJECT_DIR/daemon/venv/bin/python3" "$PROJECT_DIR/daemon/daemon.py" > "$PROJECT_DIR/daemon.log" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

notify-send -a "Roblox Sync" "Roblox Sync Gallery" "Daemon aktif di background! Tekan Alt + 1 saat bermain Roblox."
echo "Daemon aktif di background (PID $NEW_PID)"
echo "Log dapat dilihat di: $PROJECT_DIR/daemon.log"
