import React from 'react';
import { Layers, MapPin, Calendar, ChevronRight, Gamepad2 } from 'lucide-react';
import type { AlbumGroup } from '../types.js';
import { resolveImageUrl } from '../utils/api.js';
import { formatTimeRelative } from '../utils/format.js';

interface AlbumCardProps {
  album: AlbumGroup;
  onOpenAlbum: (album: AlbumGroup) => void;
}

export const AlbumCard: React.FC<AlbumCardProps> = ({ album, onOpenAlbum }) => {
  // Priority for Album Cover: Official Roblox Map Thumbnail (16:9), fallback to latest screenshot
  const hasOfficialThumb = Boolean(album.map_thumbnail_url);
  const coverUrl = album.map_thumbnail_url || resolveImageUrl(album.cover_url);

  // Stack previews from user screenshots
  const firstPhoto = resolveImageUrl(album.photos[0]?.image_url);
  const secondPhoto = album.photos[1] ? resolveImageUrl(album.photos[1].image_url) : null;
  const thirdPhoto = album.photos[2] ? resolveImageUrl(album.photos[2].image_url) : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenAlbum(album)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenAlbum(album);
        }
      }}
      className="group relative bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:border-zinc-700 hover:shadow-2xl hover:-translate-y-1 cursor-pointer flex flex-col focus:outline-none focus:ring-2 focus:ring-zinc-400"
    >
      {/* Album Preview Header with Stacked Effect */}
      <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden">
        {/* Main Cover (Official Map Thumbnail or Screenshot) */}
        <img
          src={coverUrl}
          alt={`Album ${album.place_name}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Gradient shadow overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-black/40 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
          {hasOfficialThumb ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-950/85 backdrop-blur-md text-zinc-300 border border-zinc-700 shadow-sm">
              <Gamepad2 className="w-3 h-3 text-zinc-400" />
              <span>Map Cover</span>
            </span>
          ) : <span />}

          {/* Count Badge on Top Right */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-950/85 backdrop-blur-md text-zinc-100 border border-zinc-700 shadow-md">
            <Layers className="w-3.5 h-3.5 text-zinc-300" />
            <span>{album.count} Foto</span>
          </div>
        </div>

        {/* Stacked Preview Thumbnails of User Screenshots on Bottom Right */}
        <div className="absolute bottom-2.5 right-2.5 flex items-center -space-x-2 pointer-events-none">
          {hasOfficialThumb && firstPhoto && (
            <img
              src={firstPhoto}
              alt="screenshot 1"
              className="w-7 h-7 rounded-md object-cover border-2 border-zinc-900 shadow-sm"
            />
          )}
          {secondPhoto && (
            <img
              src={secondPhoto}
              alt="screenshot 2"
              className="w-7 h-7 rounded-md object-cover border-2 border-zinc-900 shadow-sm"
            />
          )}
          {thirdPhoto && (
            <img
              src={thirdPhoto}
              alt="screenshot 3"
              className="w-7 h-7 rounded-md object-cover border-2 border-zinc-900 shadow-sm"
            />
          )}
        </div>

        {/* Map Pin / Icon on Bottom Left */}
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-[11px] text-zinc-200 bg-zinc-950/85 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-800">
          {album.icon_url ? (
            <img src={album.icon_url} alt="" className="w-3.5 h-3.5 rounded-sm object-cover" />
          ) : (
            <MapPin className="w-3 h-3 text-zinc-400" />
          )}
          <span className="truncate max-w-[140px] font-medium">{album.place_name}</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3.5 flex items-center justify-between gap-3 bg-zinc-900 border-t border-zinc-800/80 mt-auto">
        <div className="min-w-0">
          <h3 className="font-semibold text-sm text-zinc-100 truncate group-hover:text-white transition-colors">
            {album.place_name}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-zinc-500" />
              {formatTimeRelative(album.latest_captured_at)}
            </span>
            {album.place_id && (
              <span className="font-mono text-zinc-500 truncate">ID: {album.place_id}</span>
            )}
          </div>
        </div>

        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:bg-zinc-700 transition-colors flex-shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
