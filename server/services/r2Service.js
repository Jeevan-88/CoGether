/**
 * Cloudflare R2 S3-Compatible Media Integration Service
 * CoGether CoWatch Future-Ready Media Storage & Delivery Layer
 * 
 * Strict Guidelines:
 * - Read-only / safe health checks: NEVER modify, delete, overwrite or alter bucket contents.
 * - Non-blocking: CoWatch runs 100% smoothly using verified external direct media when R2 is unconfigured.
 * - Zero memory proxying: Media is delivered directly via CDN / public domain with byte-range support.
 * - Zero credentials committed to git or exposed to browser.
 */

const { logger } = require('../../packages/observability');

// Defined Standard Storage Prefixes
const R2_PREFIXES = {
  POSTERS: 'cowatch/posters',
  MEDIA: 'cowatch/media',
  SUBTITLES: 'cowatch/subtitles',
  THUMBNAILS: 'cowatch/thumbnails',
  TRAILERS: 'cowatch/trailers'
};

class R2Service {
  constructor() {
    this.accountId = process.env.R2_ACCOUNT_ID || '';
    this.accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    this.secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicBaseUrl = process.env.R2_PUBLIC_BASE_URL || '';

    this.s3Client = null;
    this._initClient();
  }

  _initClient() {
    if (!this.isConfigured()) {
      return;
    }

    try {
      // Lazy load @aws-sdk/client-s3 if available
      let S3Client;
      try {
        ({ S3Client } = require('@aws-sdk/client-s3'));
      } catch (err) {
        // Fallback resolution from local paths
        const path = require('path');
        const resolved = require.resolve('@aws-sdk/client-s3', {
          paths: [path.join(__dirname, '../node_modules'), path.join(__dirname, '../../node_modules')]
        });
        ({ S3Client } = require(resolved));
      }

      if (S3Client) {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: this.accessKeyId,
            secretAccessKey: this.secretAccessKey
          }
        });
      }
    } catch (err) {
      if (logger) {
        logger.warn('R2 Client initialization skipped or @aws-sdk/client-s3 not loaded', { error: err.message });
      }
    }
  }

  /**
   * Check if core R2 credentials and bucket are configured in environment
   */
  isConfigured() {
    return Boolean(
      this.accountId &&
      this.accessKeyId &&
      this.secretAccessKey &&
      this.bucketName
    );
  }

  /**
   * Safe, non-destructive health check.
   * Does NOT upload, alter, or delete any object.
   */
  async checkHealth() {
    const configured = this.isConfigured();
    const configStatus = {
      configured,
      accountIdSet: Boolean(this.accountId),
      bucketNameSet: Boolean(this.bucketName),
      publicBaseUrlSet: Boolean(this.publicBaseUrl),
      publicBaseUrl: this.publicBaseUrl || null,
      bucketName: this.bucketName || null,
      endpoint: this.accountId ? `https://${this.accountId}.r2.cloudflarestorage.com` : null,
      prefixes: R2_PREFIXES,
      dualSourceSupport: true
    };

    if (!configured) {
      return {
        status: 'STANDBY_UNCONFIGURED',
        ready: false,
        message: 'Cloudflare R2 credentials not configured. CoWatch is actively streaming verified external direct sources (Internet Archive H.264/MP4).',
        ...configStatus
      };
    }

    // Attempt non-destructive bucket metadata check if client is ready
    if (this.s3Client) {
      try {
        const { HeadBucketCommand } = require('@aws-sdk/client-s3');
        await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
        return {
          status: 'CONNECTED',
          ready: true,
          message: `Successfully connected to Cloudflare R2 bucket: ${this.bucketName}. Bucket exists and credentials are valid.`,
          ...configStatus
        };
      } catch (err) {
        return {
          status: 'CREDENTIAL_CHECK_FAILED',
          ready: false,
          error: err.message,
          message: 'R2 credentials or bucket name provided could not reach bucket.',
          ...configStatus
        };
      }
    }

    return {
      status: 'CONFIGURED_PENDING_CLIENT',
      ready: true,
      message: 'R2 environment variables are present. Ready for direct object resolution.',
      ...configStatus
    };
  }

  /**
   * Generate authoritative R2 storage keys using standardized hierarchy:
   * cowatch/
   *   posters/
   *   media/
   *   subtitles/
   *   thumbnails/
   *   trailers/
   */
  buildStorageKey(category, slug, filename) {
    const prefix = R2_PREFIXES[category.toUpperCase()] || `cowatch/${category.toLowerCase()}`;
    const cleanSlug = (slug || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    return `${prefix}/${cleanSlug}/${filename}`;
  }

  /**
   * Resolves playable media URL for a movie record.
   * If approved R2 storage key exists and public domain is configured, returns R2 direct delivery URL.
   * Otherwise falls back cleanly to external verified direct URL (e.g., Archive.org MP4).
   */
  resolveMediaDelivery(movie) {
    if (!movie) return null;

    if (movie.r2StorageKey && this.publicBaseUrl) {
      const baseUrl = this.publicBaseUrl.replace(/\/+$/, '');
      const key = movie.r2StorageKey.replace(/^\/+/, '');
      return {
        deliveryType: 'R2_HOSTED',
        url: `${baseUrl}/${key}`,
        mimeType: movie.mediaMimeType || 'video/mp4',
        rangeSupported: true
      };
    }

    if (movie.mediaUrl) {
      return {
        deliveryType: 'EXTERNAL_DIRECT',
        url: movie.mediaUrl,
        mimeType: movie.mediaMimeType || 'video/mp4',
        rangeSupported: Boolean(movie.rangeSupport ?? true)
      };
    }

    return {
      deliveryType: 'UNAVAILABLE',
      url: null,
      mimeType: null,
      rangeSupported: false,
      reason: movie.playableStatus || 'requires_licensed_direct_source'
    };
  }
}

const r2Service = new R2Service();
module.exports = {
  r2Service,
  R2_PREFIXES
};
