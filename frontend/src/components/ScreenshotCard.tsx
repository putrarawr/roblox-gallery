import React, { useState } from 'react';
import { Download, Share2, ExternalLink, Trash2, Clock, MapPin, Check } from 'lucide-react';
import type { Screenshot } from '../types.js';
import { resolveImageUrl } from '../utils/api.js';
import { formatFileSize, formatTimeRelative, getDownloadFilename } from '../utils/format.js';

interface ScreenshotCardProps {
  screenshot: Screenshot;
  onOpenLightbox: (screenshot: Screenshot) => void;
  onDelete: (id: string) => Promise<void>;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  screenshot,
  onOpenLightbox,
  onDelete
}) => {
  const [downloading, setDownloading] = useState(false);
  const [shared, setShared] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fullImageUrl = resolveImageUrl(screenshot.image_url);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const filename = getDownloadFilename(screenshot.place_name, screenshot.id, screenshot.image_url);

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
    } catch (err) {
      console.error('Download error:', err);
      window.open(fullImageUrl, '_blank');
    } finally {
      setTimeout(() => setDownloading(false), 600);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Roblox - ${screenshot.place_name}`,
          text: `Tangkapan layar Roblox saat bermain ${screenshot.place_name}`,
          url: fullImageUrl
        });
      } catch {
        // User canceled
      }
    } else {
      await navigator.clipboard.writeText(fullImageUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    await onDelete(screenshot.id);
  };

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={() => onOpenLightbox(screenshot)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenLightbox(screenshot);
        }
      }}
      className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-zinc-700 hover:-translate-y-0.5 cursor-pointer flex flex-col focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
        <img
          src={fullImageUrl}
          alt={`Tangkapan layar ${screenshot.place_name}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Subtle dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-black/40 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-950/85 backdrop-blur-md text-zinc-200 border border-zinc-700/80 shadow">
            <MapPin className="w-3 h-3 text-zinc-400 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{screenshot.place_name}</span>
          </span>

          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-300 bg-zinc-950/85 backdrop-blur-md border border-zinc-800">
            {formatFileSize(screenshot.file_size_bytes)}
          </span>
        </div>

        {/* Bottom Time Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[11px] text-zinc-300 bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-zinc-800">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>{formatTimeRelative(screenshot.captured_at)}</span>
        </div>
      </div>

      {/* Card Content & Action Bar */}
      <div className="p-3.5 flex items-center justify-between gap-2 bg-zinc-900 border-t border-zinc-800/80 mt-auto">
        <div className="min-w-0">
          <div className="font-semibold text-xs sm:text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
            {screenshot.place_name}
          </div>
          {screenshot.place_id ? (
            <a
              href={`https://www.roblox.com/games/${screenshot.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors mt-0.5"
            >
              <span>ID: {screenshot.place_id}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-[11px] text-zinc-500">Bukan di dalam place</span>
          )}
        </div>

        {/* Actions - Monochrome style */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Unduh gambar"
            title="Unduh resolusi penuh"
            className="w-8 h-8 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </button>

          {/* Share button */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Bagikan gambar"
            title="Bagikan atau salin link"
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors border border-zinc-700/80"
          >
            {shared ? <Check className="w-4 h-4 text-zinc-100" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDeleteClick}
            aria-label={confirmDelete ? "Konfirmasi hapus" : "Hapus gambar"}
            title={confirmDelete ? "Klik lagi untuk konfirmasi hapus" : "Hapus tangkapan"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
              confirmDelete
                ? 'bg-zinc-200 text-zinc-950 border-white font-bold'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 border-zinc-700/80'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
