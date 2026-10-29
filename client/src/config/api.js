/**
 * Frontend Centralized API Configuration
 * Supports local development (default: http://localhost:3001)
 * as well as staging and production (e.g. VITE_API_URL=https://api.cogether.tech).
 */

const isBrowser = typeof window !== 'undefined';
const isProdHost = isBrowser && (
  window.location.hostname === 'cogether.tech' ||
  window.location.hostname.endsWith('.cogether.tech') ||
  window.location.hostname.endsWith('.vercel.app')
);

const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  (isProdHost ? 'https://api.cogether.tech' : 'http://localhost:3001');

export const API_URL = rawApiUrl.replace(/\/+$/, '');

export default API_URL;
