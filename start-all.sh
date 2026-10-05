#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================================="
echo "    Roblox Cross-Platform Sync Gallery Hub"
echo "=========================================================="

# Find LAN IP address
LAN_IP=$(ip -4 addr show scope global | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n 1 || echo "localhost")

echo "📍 Backend API : http://localhost:4000 (LAN: http://$LAN_IP:4000)"
echo "📱 Mobile PWA  : http://localhost:3000 (LAN: http://$LAN_IP:3000)"
echo "⌨️  Hotkey PC   : Alt + 1"
echo "=========================================================="
echo "Buka http://$LAN_IP:3000 di browser HP Anda (atau 'Add to Home Screen' untuk install PWA)!"
echo "Tekan Ctrl+C untuk menghentikan semua service."
echo "=========================================================="

# 1. Start Backend in background
(cd backend && npm start) &
BACKEND_PID=$!

# 2. Start Frontend in background
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# 3. Trap exit signals to terminate child processes cleanly
trap "echo 'Stopping all services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM EXIT

# 4. Start Python Daemon in foreground
sleep 2
echo "Memulai Desktop Daemon..."
source daemon/venv/bin/activate
python3 daemon/daemon.py
