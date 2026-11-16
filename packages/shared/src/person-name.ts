import type { NameDisplayOrder } from "./organizations";

export interface PersonNameInput {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  fallbackName?: string | null;
}

export interface PersonSearchTarget {
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  name?: string | null;
  candidateName?: string | null;
  email?: string | null;
  phone?: string | null;
  extraFields?: Array<string | null | undefined>;
}

/**
 * Normalizes a person name string to NFC Unicode form with collapsed spaces.
 */
export function normalizeNameInput(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Folds Vietnamese and Latin diacritics (including đ/Đ -> d) and lowercases text
 * for accent-insensitive search matching.
 */
export function foldVietnameseAccents(
  value: string | null | undefined,
): string {
  const cleaned = normalizeNameInput(value);
  if (!cleaned) return "";
  return cleaned
    .replace(/[đĐ]/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
}

/**
 * Splits a legacy full-name string into `{ firstName, lastName }`.
 * Multi-word names treat the final word as `firstName` and leading words as `lastName`,
 * matching Vietnamese ("Nguyễn Anh Tuấn" -> lastName "Nguyễn Anh", firstName "Tuấn")
 * and two-word Western names ("Demo Admin" -> lastName "Demo", firstName "Admin").
 */
export function splitFullName(rawFullName: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const cleaned = normalizeNameInput(rawFullName);
  if (!cleaned) {
    return { firstName: "", lastName: "" };
  }
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return {
    firstName: parts[parts.length - 1],
    lastName: parts.slice(0, -1).join(" "),
  };
}

/**
 * Formats a person's display name from structured fields respecting the organization
 * display order (`FIRST_LAST` or `LAST_FIRST`).
 */
export function formatPersonDisplayName(
  person: PersonNameInput | null | undefined,
  order: NameDisplayOrder = "FIRST_LAST",
): string {
  if (!person) return "";
  const custom = normalizeNameInput(person.displayName);
  if (custom) return custom;

  const first = normalizeNameInput(person.firstName);
  const last = normalizeNameInput(person.lastName);
  if (first || last) {
    const parts = order === "LAST_FIRST" ? [last, first] : [first, last];
    return parts.filter(Boolean).join(" ").trim();
  }

  return (
    normalizeNameInput(person.fallbackName) || normalizeNameInput(person.name)
  );
}

/**
 * Formats a platform user's display name from `firstName`/`lastName`,
 * falling back to `name` when structured fields are not present.
 */
export function formatUserDisplayName(
  user:
    | {
        firstName?: string | null;
        lastName?: string | null;
        displayName?: string | null;
        name?: string | null;
      }
    | null
    | undefined,
  order: NameDisplayOrder = "FIRST_LAST",
): string {
  return formatPersonDisplayName(user, order);
}

/**
 * Tokenizes a search query into accent-folded lowercase terms for order-independent matching.
 */
export function tokenizePersonSearchQuery(
  rawQuery: string | null | undefined,
): string[] {
  const folded = foldVietnameseAccents(rawQuery);
  if (!folded) return [];
  const uniqueTokens = new Set<string>();
  for (const part of folded.split(/\s+/)) {
    const cleaned = part.replace(/^[,;]+|[,;]+$/g, "");
    if (cleaned) {
      uniqueTokens.add(cleaned);
    }
  }
  return Array.from(uniqueTokens);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matches a person record against a search query in an accent-insensitive,
 * Vietnamese `đ`-aware, and token-order-independent way (e.g. "Abe Takamoto"
 * matches "Takamoto Abe", "nguyen an" matches "Nguyễn Văn An").
 */
export function matchesPersonNameSearch(
  target: PersonSearchTarget | null | undefined,
  rawQuery: string | null | undefined,
): boolean {
  const tokens = tokenizePersonSearchQuery(rawQuery);
  if (tokens.length === 0) return true;
  if (!target) return false;

  const segments = [
    target.firstName,
    target.lastName,
    target.displayName,
    target.name,
    target.candidateName,
    target.email,
    target.phone,
    ...(target.extraFields ?? []),
  ]
    .map((val) => foldVietnameseAccents(val))
    .filter(Boolean);

  if (segments.length === 0) return false;
  const haystack = segments.join(" ");

  return tokens.every((token) => {
    // Pure ASCII word tokens match at word boundaries so "an" won't match "Văn" or "Trần".
    if (/^[a-z]+$/.test(token)) {
      const boundaryRegex = new RegExp(
        `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(token)}`,
        "u",
      );
      return boundaryRegex.test(haystack);
    }
    return haystack.includes(token);
  });
}
