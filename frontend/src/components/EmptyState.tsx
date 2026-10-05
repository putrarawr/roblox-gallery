import React from 'react';
import { Camera, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  hasFilter: boolean;
  onClearFilter: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ hasFilter, onClearFilter }) => {
  if (hasFilter) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
          <Camera className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Tidak ada tangkapan untuk filter ini</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Coba ganti kata kunci pencarian atau pilih kategori game lain.
        </p>
        <button
          type="button"
          onClick={onClearFilter}
          className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
        >
          Reset Filter
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-4 max-w-md mx-auto">
      <div className="relative w-16 h-16 mx-auto mb-5 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-950/40">
        <Camera className="w-8 h-8" />
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-100">Galeri Masih Kosong</h2>
      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
        Ambil tangkapan layar saat bermain Roblox di PC Anda. Gambar akan otomatis tersinkron ke halaman ini dalam hitungan detik.
      </p>

      {/* Guide Card */}
      <div className="mt-6 text-left p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            1
          </div>
          <div className="text-xs text-slate-300">
            Jalankan <span className="text-indigo-300 font-mono">daemon.py</span> di PC atau laptop Anda.
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            2
          </div>
          <div className="text-xs text-slate-300">
            Saat momen bagus di Roblox, tekan shortcut:
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-indigo-300 font-mono text-xs font-bold">
              <kbd>Alt</kbd> + <kbd>1</kbd>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
            3
          </div>
          <div className="text-xs text-slate-300">
            Gambar otomatis muncul di galeri HP ini dan siap diunduh ke galeri lokal.
          </div>
        </div>
      </div>
    </div>
  );
};
