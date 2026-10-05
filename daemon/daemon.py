#!/usr/bin/env python3
"""
Roblox Cross-Platform Sync Gallery - Desktop Daemon
Captures active screen on hotkey, resolves Roblox presence (via Sober local logs or Roblox Presence API),
and uploads to sync backend.
"""

import os
import sys
import io
import time
import glob
import re
import argparse
import logging
import subprocess
from datetime import datetime, timezone
import requests
from dotenv import load_dotenv

# Try importing screen capture and image processing
try:
    import mss
    from PIL import Image
except ImportError:
    print("[ERROR] Required modules not found. Run: pip install -r requirements.txt")
    sys.exit(1)

# Load environment configuration (check daemon dir, root dir, and current working dir)
script_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(script_dir, ".env"))
load_dotenv(os.path.join(script_dir, "..", ".env"))
load_dotenv()

# Configuration defaults
DEFAULT_API_URL = os.getenv("API_URL", "https://roblox-gallery-production.up.railway.app")
DEFAULT_DAEMON_SECRET = os.getenv("DAEMON_SECRET", "roblox-gallery-secret-token")
DEFAULT_ROBLOX_USER_ID = os.getenv("ROBLOX_USER_ID", "7429208553")
DEFAULT_HOTKEY = os.getenv("HOTKEY", "F12")
IMAGE_FORMAT = os.getenv("IMAGE_FORMAT", "PNG").upper() # PNG or JPEG
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "95"))

LOCK_FILE = "/tmp/roblox_gallery_capture.lock"
DEBOUNCE_SECONDS = 2.5

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("RobloxDaemon")


def check_capture_debounce() -> bool:
    """
    Prevents duplicate concurrent / rapid triggers within DEBOUNCE_SECONDS.
    Ensures held-down keys or repeated triggers only snapshot once.
    """
    now = time.time()
    if os.path.exists(LOCK_FILE):
        try:
            with open(LOCK_FILE, "r") as f:
                content = f.read().strip()
                if content:
                    last_time = float(content)
                    if now - last_time < DEBOUNCE_SECONDS:
                        logger.warning(f"Capture debounced ({now - last_time:.2f}s since last capture). Skipping.")
                        return False
        except Exception:
            pass

    try:
        with open(LOCK_FILE, "w") as f:
            f.write(str(now))
    except Exception as e:
        logger.debug(f"Failed to write lock file: {e}")
    return True


def get_sober_presence():
    """
    Inspect Sober Flatpak local logs to determine active placeId and universeId.
    Zero rate-limits and accurate for local Linux Roblox gameplay.
    """
    log_dir = os.path.expanduser("~/.var/app/org.vinegarhq.Sober/data/sober/appData/logs")
    if not os.path.isdir(log_dir):
        return None, None
    log_files = glob.glob(os.path.join(log_dir, "*_Player_*_last.log"))
    if not log_files:
        return None, None
    latest_log = max(log_files, key=os.path.getmtime)

    # If log was modified more than 4 hours ago, Sober session may be inactive
    if time.time() - os.path.getmtime(latest_log) > 14400:
        return None, None

    try:
        with open(latest_log, "r", errors="ignore") as f:
            lines = f.readlines()
        place_id = None
        universe_id = None
        for line in reversed(lines):
            m = re.search(r'placeid:(\d+).*?universeid:(\d+)', line)
            if m:
                place_id = m.group(1)
                universe_id = m.group(2)
                break
            m2 = re.search(r'place (\d+)', line)
            if m2 and not place_id:
                place_id = m2.group(1)
        return place_id, universe_id
    except Exception as e:
        logger.debug(f"Error reading Sober logs: {e}")
        return None, None


def get_roblox_presence(user_id: str):
    """
    Resolves Roblox placeId and placeName.
    Strategy:
    1. Inspect Sober local logs (instant, zero rate-limit, perfect on Linux).
    2. Fallback to Roblox Presence API.
    Returns: (place_id, place_name)
    """
    headers = {
        "User-Agent": "RobloxSyncGalleryDaemon/1.0",
        "Content-Type": "application/json"
    }

    # 1. Try Sober local log inspection first
    try:
        sober_pid, sober_uid = get_sober_presence()
        if sober_uid or sober_pid:
            place_name = None
            if sober_uid:
                try:
                    g_url = f"https://games.roblox.com/v1/games?universeIds={sober_uid}"
                    g_resp = requests.get(g_url, headers=headers, timeout=2.5)
                    if g_resp.status_code == 200:
                        g_data = g_resp.json().get("data", [])
                        if g_data:
                            place_name = g_data[0].get("name")
                except Exception as e:
                    logger.debug(f"Failed to fetch game details from sober universeId: {e}")

            if not place_name and sober_pid:
                try:
                    u_url = f"https://apis.roblox.com/universes/v1/places/{sober_pid}/universe"
                    u_resp = requests.get(u_url, headers=headers, timeout=2.0)
                    if u_resp.status_code == 200:
                        resolved_uid = u_resp.json().get("universeId")
                        if resolved_uid:
                            g_url = f"https://games.roblox.com/v1/games?universeIds={resolved_uid}"
                            g_resp = requests.get(g_url, headers=headers, timeout=2.0)
                            if g_resp.status_code == 200:
                                g_data = g_resp.json().get("data", [])
                                if g_data:
                                    place_name = g_data[0].get("name")
                except Exception as e:
                    logger.debug(f"Failed to resolve sober place universe: {e}")

            if place_name or sober_pid:
                logger.info(f"Resolved from Sober log: placeId={sober_pid}, name='{place_name}'")
                return sober_pid, place_name or "Roblox Game"
    except Exception as e:
        logger.debug(f"Sober resolution failed: {e}")

    # 2. Fallback to Roblox Presence API
    if not user_id or not user_id.isdigit():
        return None, "unknown place"

    presence_url = "https://presence.roblox.com/v1/presence/users"
    payload = {"userIds": [int(user_id)]}

    try:
        resp = requests.post(presence_url, json=payload, headers=headers, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            user_presences = data.get("userPresences", [])
            if user_presences:
                presence = user_presences[0]
                user_presence_type = presence.get("userPresenceType")
                # 2 = InGame
                if user_presence_type == 2:
                    place_id = presence.get("placeId")
                    universe_id = presence.get("universeId")
                    last_location = presence.get("lastLocation", "").strip()

                    place_name = last_location if last_location and last_location.lower() != "roblox" else None

                    if universe_id:
                        try:
                            g_url = f"https://games.roblox.com/v1/games?universeIds={universe_id}"
                            g_resp = requests.get(g_url, headers=headers, timeout=2.5)
                            if g_resp.status_code == 200:
                                g_data = g_resp.json().get("data", [])
                                if g_data:
                                    place_name = g_data[0].get("name", place_name)
                        except Exception as e:
                            logger.debug(f"Failed to fetch game details from universeId: {e}")

                    elif place_id and not place_name:
                        try:
                            u_url = f"https://apis.roblox.com/universes/v1/places/{place_id}/universe"
                            u_resp = requests.get(u_url, headers=headers, timeout=2.0)
                            if u_resp.status_code == 200:
                                resolved_uid = u_resp.json().get("universeId")
                                if resolved_uid:
                                    g_url = f"https://games.roblox.com/v1/games?universeIds={resolved_uid}"
                                    g_resp = requests.get(g_url, headers=headers, timeout=2.0)
                                    if g_resp.status_code == 200:
                                        g_data = g_resp.json().get("data", [])
                                        if g_data:
                                            place_name = g_data[0].get("name")
                        except Exception as e:
                            logger.debug(f"Failed to resolve place universe: {e}")

                    return str(place_id) if place_id else None, place_name or "Roblox Game"

        elif resp.status_code == 429:
            logger.warning("Roblox Presence API rate-limited (HTTP 429). Using fallback.")
    except Exception as e:
        logger.warning(f"Error checking Roblox presence: {e}")

    return None, "unknown place"


def capture_screen(format_type="PNG", quality=95) -> bytes:
    """
    Capture native primary display and return image bytes.
    Supports native Wayland capture via grim when running under Wayland.
    """
    if os.getenv("WAYLAND_DISPLAY") or os.getenv("XDG_SESSION_TYPE") == "wayland":
        import shutil
        if shutil.which("grim"):
            try:
                proc = subprocess.run(["grim", "-"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
                if format_type.upper() == "JPEG":
                    img = Image.open(io.BytesIO(proc.stdout))
                    buffer = io.BytesIO()
                    img.save(buffer, format="JPEG", quality=quality, optimize=True)
                    buffer.seek(0)
                    return buffer.getvalue()
                return proc.stdout
            except Exception as e:
                logger.debug(f"grim capture fallback to mss: {e}")

    with mss.MSS() as sct:
        monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
        sct_img = sct.grab(monitor)
        img = Image.frombytes("RGB", sct_img.size, sct_img.bgra, "raw", "BGRX")

        buffer = io.BytesIO()
        if format_type.upper() == "JPEG":
            img.save(buffer, format="JPEG", quality=quality, optimize=True)
        else:
            img.save(buffer, format="PNG", optimize=False)
        
        buffer.seek(0)
        return buffer.getvalue()


def upload_screenshot(api_url: str, secret: str, image_bytes: bytes, place_id: str, place_name: str, format_type="PNG"):
    """
    Upload captured screenshot with metadata to sync backend.
    """
    upload_url = f"{api_url.rstrip('/')}/api/gallery/upload"
    mime_type = "image/png" if format_type.upper() == "PNG" else "image/jpeg"
    ext = "png" if format_type.upper() == "PNG" else "jpg"
    filename = f"capture_{int(time.time())}.{ext}"

    captured_at = datetime.now(timezone.utc).isoformat()

    files = {
        "image": (filename, image_bytes, mime_type)
    }
    data = {
        "placeId": place_id or "",
        "placeName": place_name or "unknown place",
        "capturedAt": captured_at
    }
    headers = {
        "Authorization": f"Bearer {secret}"
    }

    start_time = time.time()
    logger.info(f"Uploading capture ({len(image_bytes)/1024:.1f} KB) - Map: '{place_name}'...")

    try:
        resp = requests.post(upload_url, files=files, data=data, headers=headers, timeout=10.0)
        duration_ms = int((time.time() - start_time) * 1000)

        if resp.status_code == 200 or resp.status_code == 201:
            result = resp.json()
            logger.info(f"SUCCESS! Uploaded in {duration_ms}ms! ID: {result.get('id')} - Synced to mobile.")
            try:
                subprocess.run(
                    ["notify-send", "-a", "Roblox Sync", "📸 Roblox Snapshot", f"Tersinkron ke Web!\nMap: {place_name}"],
                    check=False
                )
            except Exception:
                pass
            return True, result
        else:
            logger.error(f"Upload failed HTTP {resp.status_code}: {resp.text}")
            return False, resp.text
    except Exception as e:
        logger.error(f"Connection error uploading to backend: {e}")
        return False, str(e)


class CaptureController:
    def __init__(self, api_url: str, secret: str, user_id: str, format_type: str = "PNG", quality: int = 95):
        self.api_url = api_url
        self.secret = secret
        self.user_id = user_id
        self.format_type = format_type
        self.quality = quality
        self.is_busy = False

    def trigger_capture(self):
        if not check_capture_debounce():
            return

        if self.is_busy:
            logger.warning("Capture already in progress, skipping trigger...")
            return

        self.is_busy = True
        try:
            logger.info("Shortcut triggered! Capturing screen...")
            # 1. Grab screen
            image_bytes = capture_screen(self.format_type, self.quality)

            # 2. Resolve Roblox presence
            place_id, place_name = get_roblox_presence(self.user_id)
            logger.info(f"Presence check: placeId={place_id}, placeName='{place_name}'")

            # 3. Upload to backend
            upload_screenshot(self.api_url, self.secret, image_bytes, place_id, place_name, self.format_type)
        except Exception as e:
            logger.error(f"Error during capture process: {e}")
        finally:
            self.is_busy = False


def main():
    parser = argparse.ArgumentParser(description="Roblox Cross-Platform Sync Gallery - Desktop Daemon")
    parser.add_argument("--server", default=DEFAULT_API_URL, help="Backend API URL (default: %(default)s)")
    parser.add_argument("--secret", default=DEFAULT_DAEMON_SECRET, help="Daemon static authorization token")
    parser.add_argument("--user-id", default=DEFAULT_ROBLOX_USER_ID, help="Roblox User ID for presence resolution")
    parser.add_argument("--hotkey", default=DEFAULT_HOTKEY, help="Global hotkey combination (default: %(default)s)")
    parser.add_argument("--format", choices=["png", "jpeg"], default=IMAGE_FORMAT.lower(), help="Image format (png/jpeg)")
    parser.add_argument("--trigger-now", action="store_true", help="Capture and upload immediately once, then exit")

    args = parser.parse_args()

    controller = CaptureController(
        api_url=args.server,
        secret=args.secret,
        user_id=args.user_id,
        format_type=args.format.upper(),
        quality=JPEG_QUALITY
    )

    print("=====================================================")
    print("   Roblox Cross-Platform Sync Gallery - Desktop Daemon")
    print("=====================================================")
    print(f"Backend Server   : {args.server}")
    print(f"Roblox User ID   : {args.user_id or '(Not configured - will use unknown place)'}")
    print(f"Global Hotkey    : {args.hotkey}")
    print(f"Image Format     : {args.format.upper()}")
    print("=====================================================")

    if args.trigger_now:
        controller.trigger_capture()
        sys.exit(0)

    # Listen for global hotkey
    try:
        from pynput import keyboard

        hotkey_dict = {
            args.hotkey: controller.trigger_capture
        }

        logger.info(f"Listening for global hotkey: [{args.hotkey}]. Press Ctrl+C to stop.")

        with keyboard.GlobalHotKeys(hotkey_dict) as h:
            h.join()

    except Exception as e:
        logger.error(f"Failed to start hotkey listener: {e}")
        logger.info("Tip: You can still test capture anytime using: python daemon.py --trigger-now")


if __name__ == "__main__":
    main()
