# ADR-010: S3-Compatible Object Storage for Static & User Assets

## Status
Accepted

## Context
Storing file uploads (custom room backgrounds, user avatars, study PDF documents, cached product catalogs) in relational databases bloats backups, wastes IOPS, and degrades query performance. Storing them on local container disks breaks stateless horizontal autoscaling.

## Decision
Adopt **S3-Compatible Object Storage**:
- Amazon S3, Google Cloud Storage, or Cloudflare R2 for production; local MinIO for offline development.
- Relational tables store only immutable URI references and content hashes (`ETag`), never raw binary blobs.
- Direct-to-bucket pre-signed upload URLs are issued by the API Gateway to prevent file uploads from consuming backend CPU.

## Consequences
- **Positive**: Offloads bandwidth and storage from application pods; infinite scalability; seamless CDN integration.
- **Negative**: Adds pre-signed URL generation and verification lifecycle.
