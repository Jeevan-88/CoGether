/**
 * Frontend Centralized API Configuration
 * Supports local development (default: http://localhost:3001)
 * as well as staging and production (e.g. VITE_API_URL=https://api.cogether.tech).
 */

const rawApiUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  'http://localhost:3001';

export const API_URL = rawApiUrl.replace(/\/+$/, '');

export default API_URL;
