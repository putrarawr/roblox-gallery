import { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header.js';
import { ScreenshotCard } from './components/ScreenshotCard.js';
import { LightboxModal } from './components/LightboxModal.js';
import { EmptyState } from './components/EmptyState.js';
import { useRealtimeSync } from './hooks/useRealtimeSync.js';
import type { Screenshot, PlaceSummary } from './types.js';
import { getApiUrl } from './utils/api.js';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export function App() {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [places, setPlaces] = useState<PlaceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeLightbox, setActiveLightbox] = useState<Screenshot | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [itemsRes, placesRes] = await Promise.all([
        fetch(getApiUrl('/api/gallery/items?limit=100')),
        fetch(getApiUrl('/api/gallery/places'))
      ]);

      if (!itemsRes.ok) throw new Error('Gagal memuat galeri tangkapan layar');
      const itemsData = await itemsRes.json();
      setScreenshots(itemsData.items || []);

      if (placesRes.ok) {
        const placesData = await placesRes.json();
        setPlaces(placesData.places || []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle incoming realtime screenshot
  const handleNewScreenshot = useCallback((newScreenshot: Screenshot) => {
    setScreenshots((prev) => {
      // Avoid duplicate if already exists
      if (prev.some((item) => item.id === newScreenshot.id)) return prev;
      return [newScreenshot, ...prev];
    });

    // Refresh place categories in background
    fetch(getApiUrl('/api/gallery/places'))
      .then((res) => res.json())
      .then((data) => {
        if (data.places) setPlaces(data.places);
      })
      .catch(() => {});

    // Show toast
    setToastMessage(`Tangkapan baru dari "${newScreenshot.place_name}" berhasil disinkronkan`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // Realtime WebSocket sync hook
  const { status: wsStatus } = useRealtimeSync({
    onNewScreenshot: handleNewScreenshot
  });

  // Handle delete
  const handleDeleteScreenshot = async (id: string) => {
    try {
      const res = await fetch(getApiUrl(`/api/gallery/items/${id}`), { method: 'DELETE' });
      if (res.ok) {
        setScreenshots((prev) => prev.filter((item) => item.id !== id));
        if (activeLightbox?.id === id) {
          setActiveLightbox(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
      alert('Gagal menghapus tangkapan layar');
    }
  };

  // Filtered screenshots
  const filteredScreenshots = useMemo(() => {
    return screenshots.filter((item) => {
      // Place filter
      if (selectedPlaceId) {
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
  }, [screenshots, selectedPlaceId, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <Header
        wsStatus={wsStatus}
        places={places}
        selectedPlaceId={selectedPlaceId}
        onSelectPlace={setSelectedPlaceId}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalScreenshots={screenshots.length}
      />

      {/* Realtime Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 max-w-sm animate-bounce">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-indigo-600 text-white text-xs font-semibold rounded-2xl shadow-xl shadow-indigo-900/50 border border-indigo-400/40">
            <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-300" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Memuat galeri tangkapan layar...</p>
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-rose-200">Gagal terhubung ke backend</h3>
            <p className="text-xs text-rose-300/80 mt-1">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredScreenshots.length === 0 ? (
          <EmptyState
            hasFilter={selectedPlaceId !== null || searchQuery.trim() !== ''}
            onClearFilter={() => {
              setSelectedPlaceId(null);
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="space-y-4">
            {/* Gallery Grid: 1 col on mobile (<640px), 2 on small tablet, 3 on desktop, 4 on wide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredScreenshots.map((item) => (
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
    </div>
  );
}
