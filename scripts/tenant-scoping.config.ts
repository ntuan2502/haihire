/**
 * Tenant Scoping Static Analysis Configuration
 *
 * Defines whitelists, models without organizationId columns,
 * and safe query patterns for multi-tenant data isolation verification.
 */

// 1. Models that physically DO NOT have an `organizationId` column in schema
// (schema.prisma). These models inherit tenant context from relational parents
// or use primary key scoping.
export const MODELS_WITHOUT_ORG_COLUMN = new Set([
  "Interview", // Inherits tenant context via applicationId -> job.organizationId
  "Application", // Inherits tenant context via jobId -> job.organizationId & candidateId
  "TrackingClick", // Inherits tenant context via trackingLinkId -> trackingLink.organizationId
  "Organization", // Primary key is `id`, queried by id or slug
]);

// 2. Non-tenant-scoped or infrastructure service files excluded from tenant audit
export const NON_TENANT_SCOPED_FILES = [
  // Auth has no organization context during login / token verification
  "apps/api/src/auth/auth.service.ts",
  // Infrastructure services
  "apps/api/src/app.service.ts",
  "apps/api/src/common/encryption.service.ts",
  "apps/api/src/common/webhook/webhook-notifier.service.ts",
  "apps/api/src/email/email.service.ts",
  "apps/api/src/events/events.service.ts",
  "apps/api/src/metrics/metrics.service.ts",
  "apps/api/src/minio/minio.service.ts",
  "apps/api/src/prisma/prisma.service.ts",
  // Public careers endpoints (unauthenticated candidates browsing jobs)
  "apps/api/src/jobs/jobs.public.service.ts",
];

// 3. The 8 tenant-scoped business modules subject to strict static analysis
export const TENANT_SCOPED_MODULES = [
  "applications",
  "candidates",
  "jobs",
  "interviews",
  "sourcing",
  "activities",
  "organizations",
  "webhook-settings",
];

// 4. Safe query patterns or method names permitted without explicit organizationId
export const SAFE_QUERY_PATTERNS: RegExp[] = [
  // Public careers query by company slug
  /findBySlug/,
  // Health check query
  /healthCheck/,
  // Public tracking link click recording by token
  /recordClick/,
];
