/**
 * CoGether Game Schema & Type Definitions
 * Enforces production-quality game metadata, mode classification, and licensing transparency.
 */

export const GameMode = {
  SINGLE_PLAYER: 'SINGLE_PLAYER',
  LOCAL_COOP: 'LOCAL_COOP',
  ONLINE_MULTIPLAYER: 'ONLINE_MULTIPLAYER'
};

export const LicenseStatus = {
  UNKNOWN: 'UNKNOWN',
  PENDING_REVIEW: 'PENDING_REVIEW',
  LICENSE_VERIFIED: 'LICENSE_VERIFIED',
  AUTHORIZED: 'AUTHORIZED',
  DIRECT_LICENSE: 'DIRECT_LICENSE',
  DISTRIBUTOR_AUTHORIZED: 'DISTRIBUTOR_AUTHORIZED',
  REMOVED: 'REMOVED'
};

export const LaunchType = {
  LOCAL_SOURCE: 'LOCAL_SOURCE',
  DIRECT_EMBED: 'DIRECT_EMBED'
};

export const DistributionStatus = {
  AVAILABLE: 'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  GEO_RESTRICTED: 'GEO_RESTRICTED',
  MAINTENANCE: 'MAINTENANCE'
};

export const GameCategory = {
  ALL: 'all',
  RUNNERS: 'runners',
  LOCAL_COOP: 'local_coop',
  MULTIPLAYER: 'multiplayer',
  ACTION: 'action',
  SPORTS: 'sports',
  PUZZLE: 'puzzle',
  ARCADE: 'arcade'
};

/**
 * Validate game metadata object
 * @param {Object} game 
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateGameMetadata(game) {
  const errors = [];
  if (!game.id) errors.push('Missing game.id');
  if (!game.title) errors.push('Missing game.title');
  if (!game.gameMode || !Object.values(GameMode).includes(game.gameMode)) {
    errors.push(`Invalid gameMode: ${game.gameMode}`);
  }
  if (!game.licenseStatus || !Object.values(LicenseStatus).includes(game.licenseStatus)) {
    errors.push(`Invalid licenseStatus: ${game.licenseStatus}`);
  }
  if (!game.distributionStatus || !Object.values(DistributionStatus).includes(game.distributionStatus)) {
    errors.push(`Invalid distributionStatus: ${game.distributionStatus}`);
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
