export interface Screenshot {
  id: string;
  image_url: string;
  storage_key: string;
  place_id: string | null;
  place_name: string;
  file_size_bytes: number;
  captured_at: string;
  thumbnail_url?: string | null;
  icon_url?: string | null;
}

export interface PlaceSummary {
  place_id: string | null;
  place_name: string;
  count: number;
  latest_captured_at: string;
  thumbnail_url?: string | null;
  icon_url?: string | null;
}

export interface AlbumGroup {
  id: string;
  place_name: string;
  place_id: string | null;
  cover_url: string;
  map_thumbnail_url?: string | null;
  icon_url?: string | null;
  count: number;
  latest_captured_at: string;
  photos: Screenshot[];
}

export interface GalleryStats {
  totalScreenshots: number;
  totalPlaces: number;
  totalBytes: number;
}
