/**
 * CoGether Unified Navigation & History Architecture
 *
 * Provides:
 * 1. Synchronized HTML5 browser history stack (pushState, replaceState, popstate).
 * 2. Proper Back & Forward button behavior across CoGether Home, Co-Watch, Series,
 *    Content Details, and Watch Rooms.
 * 3. Safe fallback hierarchy: clicking Back never leaves CoGether or redirects to Google.
 * 4. State preservation for scroll position, category, filters, and search queries.
 */

const LISTENERS = new Set();
let currentIndex = 0;

try {
  const savedIndex = parseInt(sessionStorage.getItem('cogether_nav_index') || '0', 10);
  currentIndex = isNaN(savedIndex) ? 0 : savedIndex;
} catch (e) {}

/**
 * Maps tab names to canonical URL modes
 */
export const TAB_TO_MODE = {
  home: null,
  cinemaHub: 'cowatch',
  gamesHub: 'coplay',
  coshop: 'coshop',
  studyHub: 'costudy'
};

export const MODE_TO_TAB = {
  cowatch: 'cinemaHub',
  watch: 'cinemaHub',
  cinema: 'cinemaHub',
  coplay: 'gamesHub',
  games: 'gamesHub',
  coshop: 'coshop',
  shop: 'coshop',
  costudy: 'studyHub',
  study: 'studyHub'
};

/**
 * Parses route state from current window.location
 */
export function parseCurrentRoute() {
  if (typeof window === 'undefined') {
    return { tab: 'home', category: 'Movies', platform: null, content: null, room: null, auth: null };
  }

  const params = new URLSearchParams(window.location.search);
  const pathname = window.location.pathname;

  let tab = 'home';
  const modeParam = params.get('mode');
  if (modeParam && MODE_TO_TAB[modeParam.toLowerCase()]) {
    tab = MODE_TO_TAB[modeParam.toLowerCase()];
  }

  // Invite token in path /invite/<token>
  let inviteToken = null;
  if (pathname.includes('/invite/')) {
    inviteToken = pathname.split('/invite/')[1]?.split('/')[0]?.split('?')[0] || null;
  } else if (params.get('invite')) {
    inviteToken = params.get('invite');
  }

  const room = params.get('room') || null;
  const roomMode = params.get('roomMode') || params.get('mode') || (room ? 'video' : null);
  const watchRoom = params.get('watchRoom') === 'true' || Boolean(room && tab === 'cinemaHub');

  const category = params.get('category') || (tab === 'cinemaHub' ? 'Movies' : null);
  const platform = params.get('platform') || null;
  const content = params.get('content') || null;
  const setup = params.get('setup') || null;
  const auth = params.get('auth') || null;
  const pricing = params.get('pricing') === 'true';

  return {
    tab,
    category: category || 'Movies',
    platform,
    content,
    setup,
    room,
    roomMode,
    watchRoom,
    inviteToken,
    auth,
    pricing
  };
}

/**
 * Builds canonical URL string from route state
 */
export function buildUrl(route) {
  const params = new URLSearchParams();

  const mode = TAB_TO_MODE[route.tab];
  if (mode) {
    params.set('mode', mode);
  }

  if (route.tab === 'cinemaHub') {
    if (route.category && route.category !== 'Movies') {
      params.set('category', route.category);
    }
    if (route.platform) {
      params.set('platform', route.platform);
    }
    if (route.content) {
      params.set('content', route.content);
    }
    if (route.setup) {
      params.set('setup', route.setup);
    }
    if (route.watchRoom) {
      params.set('watchRoom', 'true');
    }
  }

  if (route.room) {
    params.set('room', route.room);
    if (route.roomMode) params.set('roomMode', route.roomMode);
  }

  if (route.auth) {
    params.set('auth', route.auth);
  }

  if (route.pricing) {
    params.set('pricing', 'true');
  }

  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

/**
 * Pushes a new route state into the browser history stack
 */
export function pushRoute(nextRoute) {
  if (typeof window === 'undefined') return;

  const currentRoute = parseCurrentRoute();
  const newUrl = buildUrl(nextRoute);
  const currentUrl = window.location.pathname + window.location.search;

  if (newUrl === currentUrl) return;

  currentIndex += 1;
  try {
    sessionStorage.setItem('cogether_nav_index', String(currentIndex));
  } catch (e) {}

  window.history.pushState(
    { ...nextRoute, coGetherIndex: currentIndex },
    document.title,
    newUrl
  );

  notifyListeners(nextRoute);
}

/**
 * Replaces current route state without adding history entry
 */
export function replaceRoute(nextRoute) {
  if (typeof window === 'undefined') return;

  const newUrl = buildUrl(nextRoute);
  window.history.replaceState(
    { ...nextRoute, coGetherIndex: currentIndex },
    document.title,
    newUrl
  );

  notifyListeners(nextRoute);
}

/**
 * Navigates back internally within CoGether.
 * If history stack has previous internal page, calls window.history.back().
 * If stack has no internal previous page (e.g. direct link entry), falls back
 * hierarchically to parent CoGether page instead of ever exiting to Google!
 */
export function navigateBackSafe(fallbackParentRoute = null) {
  if (typeof window === 'undefined') return;

  if (currentIndex > 0) {
    currentIndex = Math.max(0, currentIndex - 1);
    try {
      sessionStorage.setItem('cogether_nav_index', String(currentIndex));
    } catch (e) {}
    window.history.back();
    return;
  }

  // Fallback hierarchy if no browser history entry exists
  const current = parseCurrentRoute();
  let target = fallbackParentRoute;

  if (!target) {
    if (current.watchRoom || current.room) {
      // Exit Watch Room -> Return to content details or category
      target = { ...current, watchRoom: false, room: null };
    } else if (current.content || current.setup) {
      // Close details modal -> Return to category
      target = { ...current, content: null, setup: null };
    } else if (current.category && current.category !== 'Movies') {
      // Category -> Co-Watch Movies Home
      target = { tab: 'cinemaHub', category: 'Movies', platform: null };
    } else if (current.tab !== 'home') {
      // Service -> CoGether Home
      target = { tab: 'home', category: 'Movies', platform: null };
    } else {
      // Already at Home: Stay safe at Home
      target = { tab: 'home' };
    }
  }

  replaceRoute(target);
}

/**
 * Subscribe to popstate and internal route changes
 */
export function subscribeToRoute(callback) {
  LISTENERS.add(callback);
  return () => {
    LISTENERS.delete(callback);
  };
}

function notifyListeners(route) {
  LISTENERS.forEach((cb) => {
    try {
      cb(route);
    } catch (err) {
      console.warn('Navigation listener error:', err);
    }
  });
}

// Global popstate listener for browser Back and Forward buttons
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', (e) => {
    if (e.state && typeof e.state.coGetherIndex === 'number') {
      currentIndex = e.state.coGetherIndex;
      try {
        sessionStorage.setItem('cogether_nav_index', String(currentIndex));
      } catch (err) {}
    } else {
      currentIndex = Math.max(0, currentIndex - 1);
    }

    const route = parseCurrentRoute();
    notifyListeners(route);
  });
}
