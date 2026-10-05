export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }
  // Default to same origin / proxy
  return '';
}

export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

export function getWebSocketUrl(): string {
  const envUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL;
  
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    const parsed = new URL(envUrl);
    const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${parsed.host}/ws`;
  }

  // Fallback to window.location (local dev & proxy mode)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
