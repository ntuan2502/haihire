-- Update Organization default nameDisplayOrder to LAST_FIRST (Họ và tên đệm + Tên)
ALTER TABLE "organization"
  ALTER COLUMN "nameDisplayOrder" SET DEFAULT 'LAST_FIRST';
