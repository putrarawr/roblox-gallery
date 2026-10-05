import React from 'react';
import { Camera, Radio, Search, Filter } from 'lucide-react';
import type { PlaceSummary } from '../types.js';

interface HeaderProps {
  wsStatus: 'connected' | 'connecting' | 'disconnected';
  places: PlaceSummary[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalScreenshots: number;
}

export const Header: React.FC<HeaderProps> = ({
  wsStatus,
  places,
  selectedPlaceId,
  onSelectPlace,
  searchQuery,
  onSearchChange,
  totalScreenshots,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white flex-shrink-0">
              <Camera className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                Roblox Sync Gallery
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Tersinkron langsung dengan gameplay desktop
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                wsStatus === 'connected'
                  ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-950/60 border-amber-500/30 text-amber-400'
                  : 'bg-rose-950/60 border-rose-500/30 text-rose-400'
              }`}
              title={`Status WebSocket: ${wsStatus}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : wsStatus === 'connecting'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-rose-400'
                }`}
              />
              <span className="hidden xs:inline">
                {wsStatus === 'connected'
                  ? 'Realtime Sync'
                  : wsStatus === 'connecting'
                  ? 'Menghubungkan...'
                  : 'Offline'}
              </span>
              <Radio className="w-3 h-3 xs:hidden" />
            </div>

            <div className="hidden md:flex items-center px-2.5 py-1 rounded-full bg-slate-800 text-xs font-semibold text-slate-300 border border-slate-700">
              {totalScreenshots} Tangkapan
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari berdasarkan nama game atau map..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* Place Filter Scrollable Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => onSelectPlace(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 min-h-[36px] ${
                selectedPlaceId === null
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Filter className="w-3 h-3" />
              Semua Game ({totalScreenshots})
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
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                  }`}
                >
                  {place.place_name} ({place.count})
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
