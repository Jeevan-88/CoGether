/**
 * Dynamic Signaling URL Resolver
 * Resolves signaling gateway URL based on window.location hostname so physical
 * phones and remote LAN devices automatically route to the host server.
 */

export function getSignalingUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  if (import.meta.env?.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL;
  }

  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
  const hostname = window.location.hostname || 'localhost';
  const port = '3001';

  return `${protocol}//${hostname}:${port}`;
}
