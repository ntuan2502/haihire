-- Default organization automated email flows to disabled (opt-in)
ALTER TABLE "email_flow_config"
  ALTER COLUMN "enabled" SET DEFAULT false;
