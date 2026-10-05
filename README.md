# Roblox Cross-Platform Sync Gallery

Personal capture hub ekosistem yang menghubungkan PC gameplay Roblox dengan Mobile Web App / PWA secara realtime.

Tangkap screenshot in-game menggunakan global shortcut **Alt + 1**, otomatis lampirkan metadata map/game Roblox via Presence API, dan langsung sinkronkan ke HP untuk diunduh 1-klik ke galeri foto.

---

## ⚡ Fitur Utama

- **Zero-Friction Capture**: Tekan `Alt + 1` kapan saja saat bermain di desktop tanpa mengganggu fokus game.
- **Auto-Presence Metadata**: Otomatis query Roblox Presence API untuk mengambil nama map, Place ID, dan timestamp capture.
- **Realtime Sync (< 3 detik)**: Sinkronisasi instan via WebSocket dari PC ke HP tanpa perlu refresh halaman.
- **Mobile-First PWA**: Tampilan responsif (1 kolom di HP, 3-4 kolom di desktop), bisa di-*install* ke homescreen HP (`Add to Home Screen`) dengan tampilan fullscreen native tanpa URL bar.
- **1-Klik Download & Share**: Download resolusi penuh langsung ke memori internal HP atau bagikan lewat Web Share API.
- **Dual Storage Engine**: Siap digunakan langsung dengan local storage out-of-the-box, serta dukungan penuh untuk **Cloudflare R2** (zero egress fee).

---

## 📁 Struktur Direktori

```
roblox-sync-gallery/
├── daemon/               # Desktop daemon client (Python)
│   ├── daemon.py         # Global hotkey listener, screen grab, Roblox presence query & uploader
│   ├── requirements.txt  # Dependencies (mss, pynput, pillow, requests, python-dotenv)
│   └── .env              # Konfigurasi daemon & Roblox User ID
├── backend/              # REST & WebSocket API (Fastify + TypeScript + SQLite)
│   ├── src/
│   │   ├── server.ts     # Fastify server entry
│   │   ├── db.ts         # SQLite service & schema
│   │   ├── storage.ts    # Dual storage (Local disk & Cloudflare R2)
│   │   ├── ws.ts         # WebSocket realtime broadcaster
│   │   └── routes/       # Upload, query, places, stats endpoints
│   ├── uploads/          # Folder file gambar (jika mode local)
│   └── data/             # SQLite database file
├── frontend/             # Mobile PWA Web Gallery (React + Vite + Tailwind CSS + PWA)
│   ├── src/              # Komponen UI, Lightbox, Realtime hook, filter
│   └── public/           # Manifest, icon, PWA service worker assets
└── start-all.sh          # One-click startup script untuk semua service
```

---

## 🚀 Cara Menjalankan

### 1. Menjalankan Semua Layanan Sekaligus
Cukup jalankan script:
```bash
./start-all.sh
```

### 2. Atau Menjalankan Secara Terpisah:

#### Backend
```bash
cd backend
npm start
# Server berjalan di http://localhost:4000
```

#### Frontend PWA
```bash
cd frontend
npm run dev
# Buka di laptop: http://localhost:3000
# Buka di HP (pada Wi-Fi yang sama): http://[IP-LAPTOP]:3000
```

#### Desktop Daemon
```bash
cd daemon
source venv/bin/activate
python daemon.py
# Shortcut Alt + 1 aktif dan memantau gameplay
```

---

## ⚙️ Konfigurasi Roblox Presence (Deteksi Game Otomatis)

Agar nama game/map yang sedang dimainkan terdeteksi otomatis:
1. Buka file `daemon/.env`.
2. Masukkan ID Akun Roblox Anda di `ROBLOX_USER_ID`:
   ```env
   ROBLOX_USER_ID=123456789
   ```
   *(ID akun dapat dilihat di URL profil Roblox Anda: `https://www.roblox.com/users/{USER_ID}/profile`)*
3. Pastikan pengaturan privasi Roblox Anda mengizinkan status *"Who can see my online status"* disetel ke publik/teman.

---

## ☁️ Konfigurasi Cloud Storage (Supabase / Cloudflare R2)

Anda bisa memilih menggunakan **Supabase Storage** atau **Cloudflare R2**:

### Opsi A: Menggunakan Supabase Storage
1. Buat bucket baru di dashboard Supabase (misal nama bucket: `roblox-gallery`, diset **Public**).
2. Buka [backend/.env](file:///home/putra/.gemini/antigravity/scratch/roblox-sync-gallery/backend/.env):
   ```env
   STORAGE_DRIVER=supabase
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_KEY=your_supabase_anon_or_service_role_key
   SUPABASE_BUCKET=roblox-gallery
   ```

### Opsi B: Menggunakan Cloudflare R2
1. Buka [backend/.env](file:///home/putra/.gemini/antigravity/scratch/roblox-sync-gallery/backend/.env):
   ```env
   STORAGE_DRIVER=r2
   R2_ACCOUNT_ID=your_account_id
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_BUCKET_NAME=roblox-gallery
   R2_PUBLIC_URL=https://your-custom-domain.com
   ```

*(Jika `STORAGE_DRIVER=local`, file akan disimpan di disk lokal laptop dan disajikan otomatis).*
