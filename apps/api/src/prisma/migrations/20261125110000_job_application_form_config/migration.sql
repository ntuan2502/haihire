-- AlterTable
ALTER TABLE "job" ADD COLUMN "applicationFormConfig" JSONB;

-- AlterTable
ALTER TABLE "application" ADD COLUMN "coverLetter" TEXT,
ADD COLUMN "screeningAnswers" JSONB;
