export const APP_ERROR_CODES = {
  // Organizations
  ORG_SLUG_ALREADY_EXISTS: "ORG_SLUG_ALREADY_EXISTS",
  ORG_NOT_FOUND: "ORG_NOT_FOUND",
  ORG_NAME_REQUIRED: "ORG_NAME_REQUIRED",
  ORG_SLUG_REQUIRED: "ORG_SLUG_REQUIRED",
  ORG_MEMBER_ALREADY_EXISTS: "ORG_MEMBER_ALREADY_EXISTS",

  // Auth & Permissions
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Common & Resources
  GENERIC_ERROR: "GENERIC_ERROR",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];

export interface ApiErrorPayload {
  statusCode?: number;
  code?: AppErrorCode | string;
  message?: string;
  params?: Record<string, string | number>;
  details?: unknown;
}
