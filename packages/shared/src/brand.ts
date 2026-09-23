export const BRAND_CONFIG = {
  name: "HaiHire",
  legalName: "HaiHire Platform",
  shortName: "HaiHire",
  monogram: "H",
  tagline: "Modern Applicant Tracking System",
  description:
    "Next-Gen ATS with drag-and-drop hiring pipeline, MinIO CV storage, and live job board",
  domain: "haihire.com",
  careersTitle: "HaiHire Careers",
  systemEmailFromName: "HaiHire Platform",
  supportEmail: "support@haihire.com",
} as const;

export type BrandConfig = typeof BRAND_CONFIG;
