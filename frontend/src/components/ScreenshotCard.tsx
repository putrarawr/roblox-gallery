import React, { useState } from 'react';
import { Download, Share2, ExternalLink, Trash2, Clock, MapPin, Check } from 'lucide-react';
import type { Screenshot } from '../types.js';
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const filename = getDownloadFilename(screenshot.place_name, screenshot.id, screenshot.image_url);

      // Fetch blob to ensure native mobile download behavior
      const response = await fetch(screenshot.image_url);
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
      // Fallback
      window.open(screenshot.image_url, '_blank');
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Roblox - ${screenshot.place_name}`,
          text: `Tangkapan layar Roblox saat bermain ${screenshot.place_name}`,
          url: screenshot.image_url
        });
      } catch (err) {
        // User canceled or failed
      }
    } else {
      // Fallback: Copy link
      await navigator.clipboard.writeText(screenshot.image_url);
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
      onClick={() => onOpenLightbox(screenshot)}
      className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-slate-700 hover:shadow-indigo-950/20 hover:-translate-y-0.5 cursor-pointer flex flex-col"
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
        <img
          src={screenshot.image_url}
          alt={`Tangkapan layar ${screenshot.place_name}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient overlay for badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-auto">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-900/85 backdrop-blur-md text-indigo-300 border border-indigo-500/30 shadow">
            <MapPin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
            <span className="truncate max-w-[150px]">{screenshot.place_name}</span>
          </span>

          <span className="px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-300 bg-slate-950/80 backdrop-blur-md border border-slate-800">
            {formatFileSize(screenshot.file_size_bytes)}
          </span>
        </div>

        {/* Bottom Time Badge */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-[11px] text-slate-300 bg-slate-950/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-slate-800/80">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{formatTimeRelative(screenshot.captured_at)}</span>
        </div>
      </div>

      {/* Card Content & Action Bar */}
      <div className="p-3.5 flex items-center justify-between gap-2 bg-slate-900 border-t border-slate-800/80 mt-auto">
        <div className="min-w-0">
          <div className="font-medium text-xs sm:text-sm text-slate-200 truncate">
            {screenshot.place_name}
          </div>
          {screenshot.place_id ? (
            <a
              href={`https://www.roblox.com/games/${screenshot.place_id}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors mt-0.5"
            >
              <span>ID: {screenshot.place_id}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-500">Bukan di dalam place</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Unduh gambar"
            title="Unduh resolusi penuh"
            className="w-8 h-8 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white flex items-center justify-center transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {downloading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-slate-700"
          >
            {shared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDeleteClick}
            aria-label={confirmDelete ? "Konfirmasi hapus" : "Hapus gambar"}
            title={confirmDelete ? "Klik lagi untuk konfirmasi hapus" : "Hapus tangkapan"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${
              confirmDelete
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border-slate-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
