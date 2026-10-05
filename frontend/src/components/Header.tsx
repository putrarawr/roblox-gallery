import React from 'react';
import { Camera, Radio, Search, Filter, Layers, Grid, Settings } from 'lucide-react';
import type { PlaceSummary } from '../types.js';

interface HeaderProps {
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  places: PlaceSummary[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalScreenshots: number;
  totalAlbums: number;
  viewMode: 'albums' | 'timeline';
  onViewModeChange: (mode: 'albums' | 'timeline') => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  places,
  selectedPlaceId,
  onSelectPlace,
  searchQuery,
  onSearchChange,
  totalScreenshots,
  totalAlbums,
  viewMode,
  onViewModeChange,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-950 shadow-md flex-shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-zinc-100 truncate">
                Roblox Sync Gallery
              </h1>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Personal capture hub desktop to mobile
              </p>
            </div>
          </div>

          {/* Right Action & Status Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* View Mode Toggle: Album vs Timeline */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('albums')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'albums'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Tampilkan berdasarkan Album Map"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Album ({totalAlbums})</span>
              </button>

              <button
                type="button"
                onClick={() => onViewModeChange('timeline')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Tampilkan semua screenshot urut waktu"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Semua ({totalScreenshots})</span>
              </button>
            </div>

            {/* Live Sync Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                wsStatus === 'connected'
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
                  : wsStatus === 'connecting'
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-500'
              }`}
              title={`Status Sinkronisasi: ${wsStatus}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected'
                    ? 'bg-white animate-pulse'
                    : wsStatus === 'connecting'
                    ? 'bg-zinc-400 animate-ping'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="hidden md:inline">
                {wsStatus === 'connected'
                  ? 'Live Sync'
                  : wsStatus === 'connecting'
                  ? 'Menghubungkan'
                  : 'Offline'}
              </span>
              <Radio className="w-3 h-3 md:hidden" />
            </div>

            {/* Settings button */}
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Pengaturan server"
              title="Atur URL Backend Server"
              className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari berdasarkan nama game atau map..."
              className="w-full pl-9 pr-4 py-2 bg-zinc-900/90 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Place Filter Scrollable Pills (hanya relevan di mode timeline) */}
          {viewMode === 'timeline' && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => onSelectPlace(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 min-h-[36px] ${
                  selectedPlaceId === null
                    ? 'bg-zinc-100 text-zinc-950 font-semibold'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                <Filter className="w-3 h-3" />
                Semua ({totalScreenshots})
              </button>

              {places.map((place) => {
                const isSelected = selectedPlaceId === place.place_id || (!place.place_id && selectedPlaceId === 'unknown');
                const key = place.place_id || 'unknown';
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSelectPlace(isSelected ? null : key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors min-h-[36px] ${
                      isSelected
                        ? 'bg-zinc-100 text-zinc-950 font-semibold'
                        : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    {place.place_name} ({place.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
