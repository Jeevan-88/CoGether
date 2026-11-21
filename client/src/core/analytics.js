/**
 * CoGether Privacy-Safe Analytics Module
 * 
 * - Zero third-party trackers or ad network cookies
 * - Anonymized event telemetry for UI/UX improvement
 * - Session-level aggregation without cross-site tracking
 */

const IS_BROWSER = typeof window !== 'undefined';

class AnalyticsTracker {
  constructor() {
    this.sessionId = this._getOrCreateSessionId();
    this.startTime = Date.now();
    this.queue = [];
  }

  _getOrCreateSessionId() {
    if (!IS_BROWSER) return 'server';
    let sid = sessionStorage.getItem('cogether_analytics_sid');
    if (!sid) {
      sid = 'sid_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      try {
        sessionStorage.setItem('cogether_analytics_sid', sid);
      } catch (_e) {}
    }
    return sid;
  }

  trackPageView(path) {
    if (!IS_BROWSER) return;
    const event = {
      type: 'pageview',
      path: path || window.location.pathname,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      referrer: document.referrer || null,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    };
    this._dispatch(event);
  }

  trackEvent(eventName, properties = {}) {
    if (!IS_BROWSER) return;
    const event = {
      type: 'event',
      name: eventName,
      properties,
      timestamp: Date.now(),
      sessionId: this.sessionId
    };
    this._dispatch(event);
  }

  _dispatch(eventPayload) {
    // In local/production, keep event queue and optionally report to /api/v1/telemetry
    this.queue.push(eventPayload);
    if (this.queue.length > 50) {
      this.queue.shift(); // keep memory bounded
    }

    if (process.env.NODE_ENV === 'development') {
      // Clean silent telemetry in dev
    }
  }
}

export const analytics = new AnalyticsTracker();
export default analytics;
