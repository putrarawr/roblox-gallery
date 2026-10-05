import React, { useState, useEffect } from 'react';
import { X, Server, Check, RotateCcw } from 'lucide-react';
import { getStoredApiUrl, setStoredApiUrl } from '../utils/api.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [urlInput, setUrlInput] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrlInput(getStoredApiUrl());
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiUrl(urlInput.trim());
    setSaved(true);
    setTimeout(() => {
      onSave();
      onClose();
    }, 400);
  };

  const handleReset = () => {
    setUrlInput('');
    setStoredApiUrl('');
    setSaved(true);
    setTimeout(() => {
      onSave();
      onClose();
    }, 400);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Server"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-100"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-400" />
            <h3 className="font-semibold text-sm tracking-tight">Koneksi Backend Server</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              URL Backend API (Fastify)
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Contoh: https://roblox-api.up.railway.app"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-400 font-mono transition-colors"
            />
            <p className="text-[11px] text-zinc-400 mt-1.5 leading-relaxed">
              Jika backend di-deploy ke Railway atau VPS, masukkan URL publiknya di sini agar Cloudflare Pages dapat mengambil data dan mendengarkan event WebSocket.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white transition-colors shadow-sm"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Tersimpan!
                </>
              ) : (
                'Simpan & Hubungkan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
