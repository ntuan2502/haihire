/**
 * Tenant Scoping Static Analysis Configuration
 *
 * Defines whitelists, models without organizationId columns,
 * and safe query patterns for multi-tenant data isolation verification.
 */

// 1. Models that physically DO NOT have an `organizationId` column in schema
// (contract.prisma). These models inherit tenant context from relational parents
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
  "backend/src/auth/auth.service.ts",
  // Users service reads global system / demo user seeds
  "backend/src/users/users.service.ts",
  // Infrastructure services
  "backend/src/app.service.ts",
  "backend/src/common/encryption.service.ts",
  "backend/src/common/webhook/webhook-notifier.service.ts",
  "backend/src/email/email.service.ts",
  "backend/src/events/events.service.ts",
  "backend/src/metrics/metrics.service.ts",
  "backend/src/minio/minio.service.ts",
  "backend/src/prisma/prisma.service.ts",
  // Public careers endpoints (unauthenticated candidates browsing jobs)
  "backend/src/jobs/jobs.public.service.ts",
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
];
