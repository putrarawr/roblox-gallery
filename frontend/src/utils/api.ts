export function getStoredApiUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('roblox_gallery_api_url') || '';
  }
  return '';
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('roblox_gallery_api_url');
    if (stored && stored.trim() !== '') {
      return stored.trim().replace(/\/$/, '');
    }
  }

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }

  return '';
}

export function setStoredApiUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (!url || url.trim() === '') {
      localStorage.removeItem('roblox_gallery_api_url');
    } else {
      localStorage.setItem('roblox_gallery_api_url', url.trim().replace(/\/$/, ''));
    }
  }
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
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
    } catch {
      // fallback
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
