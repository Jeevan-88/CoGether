/**
 * WebRTC ICE & TURN Configuration Provider
 * Resolves STUN and TURN server credentials from runtime environment
 * with high-availability public STUN fallbacks.
 */

const DEFAULT_STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302',
  'stun:stun.cloudflare.com:3478'
];

function getIceConfiguration(env = process.env) {
  const iceServers = [];

  // 1. High-availability STUN
  const customStun = env.STUN_URLS ? env.STUN_URLS.split(',').map((s) => s.trim()) : null;
  const stunUrls = customStun && customStun.length > 0 ? customStun : DEFAULT_STUN_SERVERS;

  iceServers.push({
    urls: stunUrls
  });

  // 2. Optional Production TURN Relay
  if (env.TURN_URL) {
    const turnConfig = {
      urls: env.TURN_URL
    };
    if (env.TURN_USERNAME) turnConfig.username = env.TURN_USERNAME;
    if (env.TURN_CREDENTIAL) turnConfig.credential = env.TURN_CREDENTIAL;
    iceServers.push(turnConfig);
  }

  return {
    iceServers,
    iceTransportPolicy: env.ICE_TRANSPORT_POLICY || 'all',
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };
}

module.exports = {
  DEFAULT_STUN_SERVERS,
  getIceConfiguration
};
