-- CreateEnum
CREATE TYPE "AiFeatureKey" AS ENUM ('APPLICATION_SCORING', 'SCREENING_QUESTIONS', 'SCORING_CRITERIA');

-- CreateEnum
CREATE TYPE "AiProxyMode" AS ENUM ('SINGLE', 'FAILOVER', 'LOAD_BALANCE');

-- CreateEnum
CREATE TYPE "AiFeatureRouteMode" AS ENUM ('INHERIT_DEFAULT', 'SINGLE', 'FAILOVER', 'LOAD_BALANCE');

-- CreateEnum
CREATE TYPE "AiConnectionStatus" AS ENUM ('UNTESTED', 'HEALTHY', 'ERROR');

-- CreateTable
CREATE TABLE "organization_ai_connection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "defaultModelId" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "apiKeyLast4" TEXT,
    "baseUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastStatus" "AiConnectionStatus" NOT NULL DEFAULT 'UNTESTED',
    "lastError" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_ai_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_ai_feature_route" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "feature" "AiFeatureKey" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mode" "AiFeatureRouteMode" NOT NULL DEFAULT 'INHERIT_DEFAULT',
    "targets" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_ai_feature_route_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_ai_connection_organizationId_isEnabled_idx" ON "organization_ai_connection"("organizationId", "isEnabled");

-- CreateIndex
CREATE INDEX "organization_ai_feature_route_organizationId_idx" ON "organization_ai_feature_route"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_ai_feature_route_organizationId_feature_key" ON "organization_ai_feature_route"("organizationId", "feature");

-- AddForeignKey
ALTER TABLE "organization_ai_connection" ADD CONSTRAINT "organization_ai_connection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_ai_feature_route" ADD CONSTRAINT "organization_ai_feature_route_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce Row-Level Security (tenant isolation) on organization_ai_connection
ALTER TABLE "organization_ai_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_ai_connection" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "organization_ai_connection"
    USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    )
    WITH CHECK (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    );

-- Enforce Row-Level Security (tenant isolation) on organization_ai_feature_route
ALTER TABLE "organization_ai_feature_route" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_ai_feature_route" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "organization_ai_feature_route"
    USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    )
    WITH CHECK (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    );

-- AlterTable: add default routing columns before backfilling existing single-provider settings
ALTER TABLE "organization_ai_setting"
ADD COLUMN "defaultRouteMode" "AiProxyMode" NOT NULL DEFAULT 'SINGLE',
ADD COLUMN "defaultRouteTargets" JSONB NOT NULL DEFAULT '[]';

-- Backfill existing organization_ai_setting rows into organization_ai_connection
DO $$
DECLARE
  rec RECORD;
  new_conn_id TEXT;
BEGIN
  PERFORM set_config('app.bypass_rls', 'on', true);

  FOR rec IN
    SELECT
      "id",
      "organizationId",
      "provider",
      "modelId",
      "encryptedApiKey",
      "apiKeyLast4",
      "baseUrl",
      "isEnabled",
      "createdAt",
      "updatedAt"
    FROM "organization_ai_setting"
  LOOP
    new_conn_id := gen_random_uuid()::text;

    INSERT INTO "organization_ai_connection" (
      "id",
      "organizationId",
      "name",
      "provider",
      "defaultModelId",
      "encryptedApiKey",
      "apiKeyLast4",
      "baseUrl",
      "isEnabled",
      "lastStatus",
      "createdAt",
      "updatedAt"
    ) VALUES (
      new_conn_id,
      rec."organizationId",
      rec."provider"::text || ' (Default)',
      rec."provider",
      rec."modelId",
      rec."encryptedApiKey",
      rec."apiKeyLast4",
      rec."baseUrl",
      true,
      'UNTESTED',
      rec."createdAt",
      rec."updatedAt"
    );

    UPDATE "organization_ai_setting"
    SET "defaultRouteMode" = 'SINGLE',
        "defaultRouteTargets" = jsonb_build_array(
          jsonb_build_object('connectionId', new_conn_id, 'weight', 1)
        )
    WHERE "id" = rec."id";
  END LOOP;
END $$;

-- Drop legacy single-key columns now migrated into organization_ai_connection
ALTER TABLE "organization_ai_setting"
DROP COLUMN "provider",
DROP COLUMN "modelId",
DROP COLUMN "encryptedApiKey",
DROP COLUMN "apiKeyLast4",
DROP COLUMN "baseUrl";
