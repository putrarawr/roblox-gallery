import React, { useEffect, useCallback } from 'react';
import { X, Download, Share2, ExternalLink, Calendar, MapPin, HardDrive } from 'lucide-react';
import type { Screenshot } from '../types.js';
import { resolveImageUrl } from '../utils/api.js';
import { formatFileSize, formatFullDateTime, getDownloadFilename } from '../utils/format.js';

interface LightboxModalProps {
  screenshot: Screenshot | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  screenshot,
  onClose,
  onDelete
}) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (screenshot) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screenshot, handleKeyDown]);

  if (!screenshot) return null;

  const fullImageUrl = resolveImageUrl(screenshot.image_url);

  const handleDownload = async () => {
    const filename = getDownloadFilename(screenshot.place_name, screenshot.id, screenshot.image_url);
    try {
      const response = await fetch(fullImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(fullImageUrl, '_blank');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Roblox Screenshot - ${screenshot.place_name}`,
          text: `Tangkapan layar Roblox saat bermain ${screenshot.place_name}`,
          url: fullImageUrl
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(fullImageUrl);
      alert('Tautan gambar berhasil disalin ke clipboard');
    }
  };

  const handleDelete = async () => {
    if (confirm('Yakin ingin menghapus tangkapan layar ini?')) {
      await onDelete(screenshot.id);
      onClose();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detail Tangkapan Layar"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex flex-col w-full max-w-5xl max-h-[95vh] bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm sm:text-base text-zinc-100 truncate">
              {screenshot.place_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh Resolusi Asli</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              aria-label="Bagikan"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700/80"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors ml-1 border border-zinc-700/80"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Image Preview Container */}
        <div className="relative flex-1 min-h-[300px] max-h-[70vh] flex items-center justify-center bg-black p-2 overflow-auto">
          <img
            src={fullImageUrl}
            alt={screenshot.place_name}
            className="max-h-full max-w-full object-contain rounded-lg select-none"
          />
        </div>

        {/* Footer Metadata */}
        <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>{formatFullDateTime(screenshot.captured_at)}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-zinc-400" />
              <span>{formatFileSize(screenshot.file_size_bytes)}</span>
            </div>

            {screenshot.place_id && (
              <a
                href={`https://www.roblox.com/games/${screenshot.place_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-zinc-300 hover:text-white transition-colors"
              >
                <MapPin className="w-4 h-4 text-zinc-400" />
                <span>Place ID: {screenshot.place_id}</span>
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={handleDelete}
              className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors"
            >
              Hapus Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
