/**
 * WebRTC ICE & TURN Configuration Provider
 * Multi-provider support:
 * 1. Twilio Network Traversal Service (Managed Ephemeral TURN)
 *    - Supports both API Key (TWILIO_API_KEY + TWILIO_API_SECRET) and Auth Token (TWILIO_AUTH_TOKEN)
 * 2. Coturn (RFC 5766 Shared Secret Time-Windowed HMAC TURN)
 * 3. Static / Custom TURN Relay
 * 4. High-Availability Public STUN Fallback
 *
 * Never exposes permanent API keys or secrets to frontend clients.
 */

const crypto = require('crypto');

const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478'
];

// Ephemeral token in-memory cache to prevent redundant provider API requests
let memoryTurnCache = {
  expiresAt: 0,
  config: null
};

/**
 * Reset memory cache (useful for testing)
 */
function resetIceCache() {
  memoryTurnCache = { expiresAt: 0, config: null };
}

/**
 * Fetch ephemeral TURN credentials from Twilio Network Traversal API.
 * Supports:
 * - Preferred API Key auth: accountSid + apiKey + apiSecret
 * - Legacy Auth Token auth: accountSid + authToken (apiSecret = null)
 */
async function fetchTwilioTurnCredentials(accountSid, authOrKey, apiSecret = null, ttl = 86400) {
  if (!accountSid) {
    throw new Error('Twilio Account SID required');
  }

  const basicUser = apiSecret ? authOrKey : accountSid;
  const basicPass = apiSecret ? apiSecret : authOrKey;

  if (!basicUser || !basicPass) {
    throw new Error('Twilio authentication credentials required (API Key + Secret or Auth Token)');
  }

  const authHeader = 'Basic ' + Buffer.from(`${basicUser}:${basicPass}`).toString('base64');
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Tokens.json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ Ttl: String(ttl) }).toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Twilio NTS API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const iceServers = (data.ice_servers || []).map((srv) => {
      const entry = {
        urls: srv.urls || srv.url
      };
      if (srv.username) entry.username = srv.username;
      if (srv.credential) entry.credential = srv.credential;
      return entry;
    });

    return {
      iceServers,
      ttl: parseInt(data.ttl || ttl, 10),
      provider: 'twilio'
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Generate RFC 5766 TURN REST API credentials for Coturn
 */
function generateCoturnCredentials(secret, urls, userId = 'cogether-user', ttl = 86400) {
  if (!secret) {
    throw new Error('Coturn shared secret required');
  }

  const turnUrls = typeof urls === 'string'
    ? urls.split(',').map((u) => u.trim()).filter(Boolean)
    : (Array.isArray(urls) ? urls : ['turn:turn.cogether.tech:3478?transport=udp', 'turn:turn.cogether.tech:3478?transport=tcp']);

  const expiryTimestamp = Math.floor(Date.now() / 1000) + ttl;
  const username = `${expiryTimestamp}:${userId}`;
  const hmac = crypto.createHmac('sha1', secret);
  hmac.update(username);
  const credential = hmac.digest('base64');

  return {
    iceServers: [
      {
        urls: turnUrls,
        username,
        credential
      }
    ],
    ttl,
    provider: 'coturn'
  };
}

/**
 * Resolve Synchronous ICE Configuration (Legacy & Fallback)
 */
function getIceConfiguration(env = process.env) {
  const iceServers = [];

  // 1. High-availability STUN
  const customStun = env.STUN_URLS ? env.STUN_URLS.split(',').map((s) => s.trim()) : null;
  const stunUrls = customStun && customStun.length > 0 ? customStun : DEFAULT_STUN_SERVERS;

  iceServers.push({
    urls: stunUrls
  });

  // 2. Optional Static TURN Relay
  if (env.TURN_URL) {
    const turnConfig = {
      urls: env.TURN_URL.includes(',') ? env.TURN_URL.split(',').map((s) => s.trim()) : env.TURN_URL
    };
    if (env.TURN_USERNAME) turnConfig.username = env.TURN_USERNAME;
    if (env.TURN_CREDENTIAL) turnConfig.credential = env.TURN_CREDENTIAL;
    iceServers.push(turnConfig);
  }

  return {
    iceServers,
    iceTransportPolicy: env.ICE_TRANSPORT_POLICY || 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
    provider: env.TURN_URL ? 'static' : 'stun_only'
  };
}

/**
 * Resolve Asynchronous ICE Configuration with Ephemeral TURN Provisioning
 */
async function getIceConfigurationAsync(env = process.env, options = {}) {
  const now = Date.now();
  const provider = (env.TURN_PROVIDER || '').toLowerCase();

  // Return cached result if valid
  if (memoryTurnCache.config && memoryTurnCache.expiresAt > now + 300000) { // 5-min safety buffer
    return memoryTurnCache.config;
  }

  const customStun = env.STUN_URLS ? env.STUN_URLS.split(',').map((s) => s.trim()) : null;
  const baseStunUrls = customStun && customStun.length > 0 ? customStun : DEFAULT_STUN_SERVERS;
  const defaultStunEntry = { urls: baseStunUrls };

  let resolvedConfig = null;

  // 1. Twilio Network Traversal (Priority 1 if configured)
  const twilioSid = env.TWILIO_ACCOUNT_SID;
  const twilioApiKey = env.TWILIO_API_KEY;
  const twilioApiSecret = env.TWILIO_API_SECRET;
  const twilioToken = env.TWILIO_AUTH_TOKEN;

  const hasTwilioKeyAuth = twilioSid && twilioApiKey && twilioApiSecret;
  const hasTwilioTokenAuth = twilioSid && twilioToken;

  if (provider === 'twilio' || (!provider && (hasTwilioKeyAuth || hasTwilioTokenAuth))) {
    try {
      const twilioRes = hasTwilioKeyAuth
        ? await fetchTwilioTurnCredentials(twilioSid, twilioApiKey, twilioApiSecret)
        : await fetchTwilioTurnCredentials(twilioSid, twilioToken, null);

      const mergedServers = [defaultStunEntry, ...twilioRes.iceServers];
      resolvedConfig = {
        iceServers: mergedServers,
        iceTransportPolicy: env.ICE_TRANSPORT_POLICY || 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        provider: 'twilio',
        authMethod: hasTwilioKeyAuth ? 'api_key' : 'auth_token',
        ttl: twilioRes.ttl,
        fetchedAt: new Date().toISOString()
      };

      memoryTurnCache = {
        expiresAt: now + (twilioRes.ttl * 1000),
        config: resolvedConfig
      };
      return resolvedConfig;
    } catch (err) {
      console.warn('[WebRTC] Twilio TURN resolution failed, falling back to STUN/local configuration:', err.message);
    }
  }

  // 2. Coturn REST API HMAC Generation (Priority 2 if configured)
  const coturnSecret = env.COTURN_SECRET;
  if (provider === 'coturn' || (!provider && coturnSecret)) {
    try {
      const coturnRes = generateCoturnCredentials(
        coturnSecret,
        env.COTURN_URLS,
        options.userId || 'cogether-user',
        parseInt(env.TURN_TTL_SECONDS || '86400', 10)
      );
      resolvedConfig = {
        iceServers: [defaultStunEntry, ...coturnRes.iceServers],
        iceTransportPolicy: env.ICE_TRANSPORT_POLICY || 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        provider: 'coturn',
        ttl: coturnRes.ttl,
        fetchedAt: new Date().toISOString()
      };
      return resolvedConfig;
    } catch (err) {
      console.warn('[WebRTC] Coturn credentials generation failed:', err.message);
    }
  }

  // 3. Static TURN or fallback to synchronous STUN configuration
  const syncConfig = getIceConfiguration(env);
  resolvedConfig = {
    ...syncConfig,
    ttl: 86400,
    fetchedAt: new Date().toISOString()
  };

  return resolvedConfig;
}

module.exports = {
  DEFAULT_STUN_SERVERS,
  getIceConfiguration,
  getIceConfigurationAsync,
  fetchTwilioTurnCredentials,
  generateCoturnCredentials,
  resetIceCache
};
