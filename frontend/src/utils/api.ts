export function normalizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean) return '';

  // If user entered without protocol (e.g. "roblox-gallery-production.up.railway.app")
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    // If localhost or local IP e.g. 192.168.x.x:4000
    if (clean.startsWith('localhost') || clean.startsWith('127.0.0.1') || clean.match(/^192\.168\./) || clean.match(/^10\./)) {
      clean = `http://${clean}`;
    } else {
      clean = `https://${clean}`;
    }
  }

  return clean;
}

export function getStoredApiUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('roblox_gallery_api_url');
    if (stored && stored.trim() !== '') {
      return normalizeUrl(stored);
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return normalizeUrl(envUrl);
  }

  return '';
}

export function setStoredApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem('roblox_gallery_api_url');
    } else {
      const normalized = normalizeUrl(url);
      localStorage.setItem('roblox_gallery_api_url', normalized);
    }
  }
}

export function getApiBaseUrl(): string {
  return getStoredApiUrl();
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!base) return cleanPath;
  return `${base}${cleanPath}`;
}

export function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const base = getApiBaseUrl();
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${cleanPath}`;
}

export function getWebSocketUrl(): string {
  const base = getApiBaseUrl();
  
  if (base && base.trim() !== '') {
    try {
      const parsed = new URL(base);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${parsed.host}/ws`;
    } catch (e) {
      console.warn('Failed to parse base URL for WS:', e);
    }
  }

  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && typeof envWs === 'string' && envWs.trim() !== '') {
    return envWs;
  }

  // Fallback to window.location (local dev & proxy mode)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  return 'ws://localhost:4000/ws';
}
