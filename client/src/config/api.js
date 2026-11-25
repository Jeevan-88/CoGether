/**
 * Frontend Centralized API Configuration & Safe Response Helpers
 * Supports local development (default: http://localhost:3001)
 * as well as staging and production (e.g. VITE_API_URL=https://api.cogether.tech).
 */

const isBrowser = typeof window !== 'undefined';
const hostname = isBrowser ? (window.location.hostname || '') : '';
const isLocalHostname =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname === '[::1]';

const isProdHost = isBrowser && (
  hostname === 'cogether.tech' ||
  hostname.endsWith('.cogether.tech') ||
  hostname.endsWith('.vercel.app')
);

const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  (isProdHost || (!isLocalHostname && isBrowser && window.location.protocol === 'https:')
    ? 'https://api.cogether.tech'
    : 'http://localhost:3001');

export const API_URL = rawApiUrl.replace(/\/+$/, '');

/**
 * Safely parses a Fetch API Response without crashing on HTML 404/502 error pages.
 * Converts unexpected non-JSON responses into structured error objects so
 * auth & data screens never misreport HTTP errors as a "Network Error".
 */
export async function parseApiResponse(res) {
  const rawText = await res.text();
  if (!rawText) {
    return {
      success: res.ok,
      status: res.status,
      ...(res.ok ? {} : { error: `HTTP_${res.status}`, message: `Server returned an empty response (HTTP ${res.status}).` })
    };
  }

  try {
    const parsed = JSON.parse(rawText);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return { success: res.ok, data: parsed };
  } catch {
    const looksLikeHtml = /^\s*</.test(rawText) || rawText.includes('<!DOCTYPE');
    const cannotMatch = rawText.match(/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+([^\s<]+)/i);
    const detail = cannotMatch
      ? `API endpoint ${cannotMatch[1]} ${cannotMatch[2]} returned 404 HTML (backend deploy update required).`
      : looksLikeHtml
        ? `Server returned an unexpected HTML page instead of JSON (HTTP ${res.status}).`
        : rawText.slice(0, 200);

    return {
      success: false,
      status: res.status,
      error: res.status === 404 ? 'BACKEND_ROUTE_UNAVAILABLE' : 'INVALID_SERVER_RESPONSE',
      message: detail
    };
  }
}

export function formatNetworkError(err, fallback = 'Unable to reach the CoGether server. Please check your connection and try again.') {
  if (!err) return fallback;
  const msg = String(err.message || err);
  if (
    err.name === 'TypeError' &&
    (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed'))
  ) {
    return 'Cannot reach the CoGether API server right now. Check your internet connection or try again shortly.';
  }
  return msg || fallback;
}

export default API_URL;
