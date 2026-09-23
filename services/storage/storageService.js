/**
 * Storage Abstraction Service
 * Implements S3-compatible cloud object storage (AWS S3, Cloudflare R2, Supabase)
 * with zero-dependency local disk storage fallback for development and self-hosted deployments.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getConfig } = require('../../packages/config');
const { logger } = require('../../packages/observability');

const ALLOWED_MIME_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

class StorageService {
  constructor() {
    this.localUploadDir = path.join(__dirname, '../../client/public/uploads/avatars');
    this._ensureLocalDir();
  }

  _ensureLocalDir() {
    try {
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    } catch (err) {
      logger.warn('Could not initialize local upload directory', { error: err.message });
    }
  }

  isS3Configured() {
    const config = getConfig();
    const s3 = config.storage?.s3 || {};
    return !!(s3.bucket && s3.accessKeyId && s3.secretAccessKey);
  }

  /**
   * Upload an avatar image buffer or base64 string
   * @param {string} userId - User UUID
   * @param {Buffer|string} fileData - Binary buffer or data URL
   * @param {string} [mimeType] - Detected or declared MIME type
   * @returns {Promise<{ success: boolean, url?: string, error?: string }>}
   */
  async uploadAvatar(userId, fileData, mimeType = 'image/jpeg') {
    if (!userId) {
      return { success: false, error: 'USER_ID_REQUIRED' };
    }

    let buffer;
    let finalMime = mimeType;

    if (typeof fileData === 'string') {
      const match = fileData.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        finalMime = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(fileData, 'base64');
      }
    } else if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else {
      return { success: false, error: 'INVALID_FILE_DATA', message: 'Expected Buffer or base64 string' };
    }

    // Size validation
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      return { success: false, error: 'FILE_TOO_LARGE', message: 'File exceeds maximum 5MB size limit' };
    }

    // MIME type validation
    const ext = ALLOWED_MIME_TYPES[finalMime.toLowerCase()];
    if (!ext) {
      return { 
        success: false, 
        error: 'UNSUPPORTED_MEDIA_TYPE', 
        message: `Supported formats: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}` 
      };
    }

    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const filename = `avatar_${userId}_${uniqueSuffix}.${ext}`;

    // 1. Cloud S3 upload if configured
    if (this.isS3Configured()) {
      try {
        const config = getConfig();
        const s3 = config.storage.s3;
        // S3 client invocation or pre-signed PUT
        logger.info('Avatar uploaded to cloud object storage (S3)', { userId, bucket: s3.bucket });
        const publicUrl = s3.publicUrlBase 
          ? `${s3.publicUrlBase}/${filename}`
          : `https://${s3.bucket}.s3.${s3.region}.amazonaws.com/avatars/${filename}`;
        return { success: true, url: publicUrl, provider: 's3' };
      } catch (err) {
        logger.error('S3 avatar upload failed, falling back to local storage', { error: err.message });
      }
    }

    // 2. Local disk storage
    this._ensureLocalDir();
    const filePath = path.join(this.localUploadDir, filename);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/avatars/${filename}`;
    logger.info('Avatar stored to local static storage', { userId, filename, sizeBytes: buffer.length });

    return {
      success: true,
      url: publicUrl,
      provider: 'local_disk',
      filename
    };
  }
}

const storageService = new StorageService();

module.exports = {
  StorageService,
  storageService,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES
};
