-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'GEMINI', 'OPENROUTER', 'OPENAI_COMPATIBLE');

-- CreateTable
CREATE TABLE "organization_ai_setting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "modelId" TEXT NOT NULL,
    "encryptedApiKey" TEXT,
    "apiKeyLast4" TEXT,
    "baseUrl" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_ai_setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_ai_setting_organizationId_key" ON "organization_ai_setting"("organizationId");

-- AddForeignKey
ALTER TABLE "organization_ai_setting" ADD CONSTRAINT "organization_ai_setting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce Row-Level Security (tenant isolation)
ALTER TABLE "organization_ai_setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organization_ai_setting" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy ON "organization_ai_setting"
    USING (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    )
    WITH CHECK (
      current_setting('app.bypass_rls', true) = 'on'
      OR "organizationId" = NULLIF(current_setting('app.current_tenant_id', true), '')
    );
