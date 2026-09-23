/**
 * CoWatch Content & Provider Repository
 * Authoritative PostgreSQL-backed storage for media, providers, and licenses.
 */

const { db } = require('../../packages/database/client');

function mapContentRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    thumbnail: row.thumbnail,
    backdrop: row.backdrop,
    contentType: row.content_type,
    genre: row.genre,
    year: row.year,
    duration: row.duration,
    language: row.language,
    providerId: row.provider_id,
    providerName: row.provider_name || null,
    providerLogo: row.provider_logo || null,
    sourceType: row.source_type,
    playbackMode: row.playback_mode,
    licenseStatus: row.license_status,
    availabilityStatus: row.availability_status,
    embedAllowed: row.embed_allowed,
    syncCapability: row.sync_capability,
    screenShareSupported: row.screen_share_supported,
    watchPartySupported: row.watch_party_supported,
    region: row.region,
    externalUrl: row.external_url,
    providerContentId: row.provider_content_id,
    videoStreamUrl: row.video_stream_url,
    isFeatured: row.is_featured,
    isTrending: row.is_trending,
    createdAt: row.created_at
  };
}

function mapProviderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    officialUrl: row.official_url,
    embedCapability: row.embed_capability,
    embedSupported: Boolean(row.embed_supported),
    officialPlayerSupported: Boolean(row.official_player_supported),
    syncSupported: Boolean(row.sync_supported),
    companionModeSupported: Boolean(row.companion_mode_supported),
    screenShareSupported: Boolean(row.screen_share_supported),
    extensionSupported: Boolean(row.extension_supported),
    drmProtected: Boolean(row.drm_protected),
    regionRestricted: Boolean(row.region_restricted),
    accountRequired: Boolean(row.requires_account),
    officialApiStatus: row.official_api_status,
    drmType: row.drm_type,
    screenShareBehavior: row.screen_share_behavior,
    requiresAccount: row.requires_account,
    deepLinkTemplate: row.deep_link_template,
    termsRestrictionNote: row.terms_restriction_note,
    createdAt: row.created_at
  };
}

async function getAllContent({
  contentType,
  providerId,
  genre,
  verifiedOnly = false,
  search,
  featured,
  trending,
  limit = 50,
  offset = 0
} = {}) {
  const conditions = ["c.availability_status = 'AVAILABLE'"];
  const params = [];

  if (contentType && contentType !== 'ALL') {
    params.push(contentType.toUpperCase());
    conditions.push(`c.content_type = $${params.length}`);
  }

  if (providerId) {
    params.push(providerId);
    conditions.push(`c.provider_id = $${params.length}`);
  }

  if (genre) {
    params.push(`%${genre.toLowerCase()}%`);
    conditions.push(`LOWER(c.genre) LIKE $${params.length}`);
  }

  if (verifiedOnly) {
    conditions.push("c.license_status IN ('LICENSE_VERIFIED', 'PUBLIC_DOMAIN_VERIFIED', 'OPEN_LICENSE_VERIFIED', 'PROVIDER_AUTHORIZED')");
  }

  if (featured !== undefined) {
    params.push(Boolean(featured));
    conditions.push(`c.is_featured = $${params.length}`);
  }

  if (trending !== undefined) {
    params.push(Boolean(trending));
    conditions.push(`c.is_trending = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(LOWER(c.title) LIKE $${params.length} OR LOWER(c.description) LIKE $${params.length} OR LOWER(c.genre) LIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countRes = await db.query(
    `SELECT COUNT(*) FROM cowatch.contents c ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0].count, 10);

  // Query with provider details join
  params.push(limit);
  const limitParam = `$${params.length}`;
  params.push(offset);
  const offsetParam = `$${params.length}`;

  const sql = `
    SELECT 
      c.*,
      p.name AS provider_name,
      p.logo_url AS provider_logo
    FROM cowatch.contents c
    LEFT JOIN cowatch.providers p ON c.provider_id = p.id
    ${whereClause}
    ORDER BY 
      c.is_featured DESC,
      c.is_trending DESC,
      c.created_at DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const { rows } = await db.query(sql, params);
  return {
    contents: rows.map(mapContentRow),
    total,
    limit,
    offset
  };
}

async function getContentById(id) {
  const sql = `
    SELECT 
      c.*,
      p.name AS provider_name,
      p.logo_url AS provider_logo,
      p.embed_capability AS provider_embed_capability,
      p.drm_type AS provider_drm_type,
      p.screen_share_behavior AS provider_screen_share_behavior,
      p.deep_link_template AS provider_deep_link_template
    FROM cowatch.contents c
    LEFT JOIN cowatch.providers p ON c.provider_id = p.id
    WHERE c.id = $1
  `;
  const { rows } = await db.query(sql, [id]);
  if (!rows || rows.length === 0) return null;
  const mapped = mapContentRow(rows[0]);
  mapped.providerDetails = {
    embedCapability: rows[0].provider_embed_capability,
    drmType: rows[0].provider_drm_type,
    screenShareBehavior: rows[0].provider_screen_share_behavior,
    deepLinkTemplate: rows[0].provider_deep_link_template
  };
  return mapped;
}

async function getAllProviders() {
  const { rows } = await db.query(
    `SELECT * FROM cowatch.providers ORDER BY name ASC`
  );
  return rows.map(mapProviderRow);
}

async function getProviderById(id) {
  const { rows } = await db.query(
    `SELECT * FROM cowatch.providers WHERE id = $1`,
    [id]
  );
  return mapProviderRow(rows[0]);
}

module.exports = {
  getAllContent,
  getContentById,
  getAllProviders,
  getProviderById
};
