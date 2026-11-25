import { API_URL } from '../config/api.js';

/**
 * Dynamic Signaling URL Resolver
 * Resolves signaling gateway URL to local host :3001 during LAN/local dev,
 * or to API_URL (e.g. https://api.cogether.tech) in staging and production.
 */
export function getSignalingUrl() {
  if (typeof window === 'undefined') {
    return 'http://localhost:3001';
  }

  if (import.meta.env?.VITE_SIGNALING_URL) {
    return import.meta.env.VITE_SIGNALING_URL.replace(/\/+$/, '');
  }

  const hostname = window.location.hostname || 'localhost';
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

  if (isLocalHost && window.location.protocol !== 'https:') {
    return `http://${hostname}:3001`;
  }

  return API_URL;
}
