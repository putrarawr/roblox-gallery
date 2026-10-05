import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.js';
import { ScreenshotCard } from './components/ScreenshotCard.js';
import { AlbumCard } from './components/AlbumCard.js';
import { LightboxModal } from './components/LightboxModal.js';
import { SettingsModal } from './components/SettingsModal.js';
import { EmptyState } from './components/EmptyState.js';
import { useRealtimeSync } from './hooks/useRealtimeSync.js';
import type { Screenshot, PlaceSummary, AlbumGroup } from './types.js';
import { getApiUrl } from './utils/api.js';
import { RefreshCw, AlertCircle, ArrowLeft, ExternalLink, Settings, Sparkles } from 'lucide-react';

export function App() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedAlbum, setSelectedAlbum] = useState<AlbumGroup | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<Screenshot | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'albums' | 'timeline'>('albums');

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const itemsUrl = getApiUrl('/api/gallery/items?limit=100');
      const placesUrl = getApiUrl('/api/gallery/places');

      const itemsRes = await fetch(itemsUrl);
      const contentType = itemsRes.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        throw new Error('Backend belum terhubung. Silakan atur URL backend di menu pengaturan.');
      }

      if (!itemsRes.ok) throw new Error('Gagal memuat galeri tangkapan layar');
      const itemsData = await itemsRes.json();
      setScreenshots(itemsData.items || []);

      // Fetch places
      try {
        const placesRes = await fetch(placesUrl);
        if (placesRes.ok) {
          const placesData = await placesRes.json();
          setPlaces(placesData.places || []);
        }
      } catch {
        // silent fail for secondary endpoint
      }
    } catch (err: any) {
      console.warn('Fetch error:', err);
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group screenshots into Albums by Map / Place Name
  const albumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, Screenshot[]>();

    for (const item of screenshots) {
      const name = (item.place_name || 'unknown place').trim();
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(item);
    }

    return Array.from(map.entries())
      .map(([placeName, photos]) => {
        const sorted = [...photos].sort(
          (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
        );
        const placeId = sorted[0].place_id;
        const placeMeta = places.find(
          (p) => (placeId && p.place_id === placeId) || p.place_name.toLowerCase() === placeName.toLowerCase()
        );

        return {
          id: placeId || placeName,
          place_name: placeName,
          place_id: placeId,
          cover_url: sorted[0].image_url,
          map_thumbnail_url: placeMeta?.thumbnail_url || null,
          icon_url: placeMeta?.icon_url || null,
          count: sorted.length,
          latest_captured_at: sorted[0].captured_at,
          photos: sorted
        };
      })
      .sort((a, b) => new Date(b.latest_captured_at).getTime() - new Date(a.latest_captured_at).getTime());
  }, [screenshots, places]);

  // Handle incoming realtime screenshot
  const handleNewScreenshot = useCallback((newScreenshot: Screenshot) => {
    setScreenshots((prev) => {
      if (prev.some((item) => item.id === newScreenshot.id)) return prev;
      return [newScreenshot, ...prev];
    });

    // Refresh places in background to fetch official map thumbnail
    fetch(getApiUrl('/api/gallery/places'))
      .then((res) => res.json())
      .then((data) => {
        if (data?.places) setPlaces(data.places);
      })
      .catch(() => {});

    setToastMessage(`Tangkapan baru dari "${newScreenshot.place_name}" berhasil disinkronkan`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Realtime WebSocket sync hook
  const { status: wsStatus, reconnect: reconnectWs } = useRealtimeSync({
    onNewScreenshot: handleNewScreenshot
  });

  const handleSettingsSaved = () => {
    fetchData();
    reconnectWs();
  };

  // Handle delete
  const handleDeleteScreenshot = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/gallery/items/${id}`), { method: 'DELETE' });
      if (res.ok) {
        setScreenshots((prev) => prev.filter((item) => item.id !== id));
        if (activeLightbox?.id === id) {
          setActiveLightbox(null);
        }
        if (selectedAlbum) {
          setSelectedAlbum((prev) => {
            if (!prev) return null;
            const updated = prev.photos.filter((p) => p.id !== id);
            if (updated.length === 0) return null;
            return {
              ...prev,
              count: updated.length,
              photos: updated
            };
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
      alert('Gagal menghapus tangkapan layar');
    }
  };

  // Filtered albums based on search query
  const filteredAlbums = useMemo(() => {
    if (!searchQuery.trim()) return albumGroups;
    const query = searchQuery.toLowerCase().trim();
    return albumGroups.filter((album) =>
      album.place_name.toLowerCase().includes(query) || (album.place_id && album.place_id.includes(query))
    );
  }, [albumGroups, searchQuery]);

  // Filtered screenshots for timeline view or open album
  const currentScreenshots = useMemo(() => {
    const list = selectedAlbum ? selectedAlbum.photos : screenshots;

    return list.filter((item) => {
      // Place filter
      if (!selectedAlbum && selectedPlaceId) {
        if (selectedPlaceId === 'unknown') {
          if (item.place_id) return false;
        } else if (item.place_id !== selectedPlaceId) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesPlace = (item.place_name || '').toLowerCase().includes(query);
        const matchesId = (item.place_id || '').toLowerCase().includes(query);
        if (!matchesPlace && !matchesId) return false;
      }

      return true;
    });
  }, [screenshots, selectedAlbum, selectedPlaceId, searchQuery]);

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Header */}
      <Header
        wsStatus={wsStatus}
        places={places}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalScreenshots={screenshots.length}
        totalAlbums={albumGroups.length}
        viewMode={viewMode}
        onViewModeChange={(mode) => {
          setViewMode(mode);
          setSelectedAlbum(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Realtime Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-zinc-100 text-zinc-950 text-xs font-semibold rounded-2xl shadow-2xl border border-zinc-300">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-zinc-950" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 text-zinc-400">
            <RefreshCw className="w-7 h-7 animate-spin text-zinc-300 mb-3" />
            <p className="text-xs font-medium tracking-wide">Memuat galeri foto...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-14 p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center shadow-xl">
            <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-zinc-100">Koneksi Backend Belum Terhubung</h3>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{error}</p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 transition-colors shadow-sm"
              >
                <Settings className="w-3.5 h-3.5" />
                Atur URL Backend
              </button>
              <button
                type="button"
                onClick={fetchData}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors border border-zinc-700"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        ) : screenshots.length === 0 ? (
          <EmptyState
            hasFilter={selectedPlaceId !== null || searchQuery.trim() !== ''}
            onClearFilter={() => {
              setSelectedPlaceId(null);
              setSearchQuery('');
            }}
          />
        ) : selectedAlbum ? (
          /* Album Detail View */
          <div className="space-y-5 animate-fadeIn">
            {/* Album Header Bar */}
            <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-lg">
              {/* Official Map Banner Backdrop */}
              {selectedAlbum.map_thumbnail_url && (
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <img
                    src={selectedAlbum.map_thumbnail_url}
                    alt=""
                    className="w-full h-full object-cover filter blur-sm scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-zinc-950/50" />
                </div>
              )}

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <button
                    type="button"
                    onClick={() => setSelectedAlbum(null)}
                    className="p-2.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/80 shadow-sm flex-shrink-0"
                    title="Kembali ke daftar album"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Official Game Icon */}
                  {selectedAlbum.icon_url && (
                    <img
                      src={selectedAlbum.icon_url}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700 shadow-md flex-shrink-0"
                    />
                  )}

                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {selectedAlbum.place_name}
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                      <span>{selectedAlbum.count} Tangkapan Layar</span>
                      {selectedAlbum.place_id && (
                        <a
                          href={`https://www.roblox.com/games/${selectedAlbum.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-zinc-400 hover:text-white font-mono transition-colors"
                        >
                          <span>ID: {selectedAlbum.place_id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedAlbum(null)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700/80"
                  >
                    Lihat Semua Album
                  </button>
                </div>
              </div>
            </div>

            {/* Grid of Photos in this Album */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentScreenshots.map((item) => (
                <ScreenshotCard
                  key={item.id}
                  screenshot={item}
                  onOpenLightbox={setActiveLightbox}
                  onDelete={handleDeleteScreenshot}
                />
              ))}
            </div>
          </div>
        ) : viewMode === 'albums' ? (
          /* Albums Overview Grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Album per Map ({filteredAlbums.length} Map)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAlbums.map((album) => (
                <AlbumCard
                  key={album.id}
                  album={album}
                  onOpenAlbum={(alb) => setSelectedAlbum(alb)}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Timeline All Photos Grid */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Semua Tangkapan Layar ({currentScreenshots.length} Foto)
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentScreenshots.map((item) => (
                <ScreenshotCard
                  key={item.id}
                  screenshot={item}
                  onOpenLightbox={setActiveLightbox}
                  onDelete={handleDeleteScreenshot}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Lightbox Modal */}
      <LightboxModal
        screenshot={activeLightbox}
        onClose={() => setActiveLightbox(null)}
        onDelete={handleDeleteScreenshot}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSettingsSaved}
      />
    </div>
  );
}
