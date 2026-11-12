import { Prisma } from "@prisma/client";
import {
  matchesPersonNameSearch,
  tokenizePersonSearchQuery,
} from "@haihire/shared";
import type { PrismaService } from "../prisma/prisma.service";

export interface CandidateSearchOptions {
  organizationId?: string | null;
  rawSearch: string;
  includeNotes?: boolean;
}

function escapePostgresRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeSqlLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/**
 * Finds candidate IDs matching `rawSearch` with accent-insensitive,
 * Vietnamese `đ`-aware, and token-order-independent semantics.
 *
 * Uses PostgreSQL `unaccent` + parameterized `$queryRaw` in production
 * and falls back cleanly to JS `matchesPersonNameSearch` under unit-test mocks
 * or Postgres instances lacking the `unaccent` extension.
 */
export async function findMatchingCandidateIds(
  prisma: PrismaService,
  options: CandidateSearchOptions,
): Promise<string[]> {
  const tokens = tokenizePersonSearchQuery(options.rawSearch);
  if (tokens.length === 0) {
    return [];
  }

  const hasRawSql =
    typeof (prisma as { $queryRaw?: unknown }).$queryRaw === "function";

  if (hasRawSql) {
    try {
      const targetExpr = options.includeNotes
        ? Prisma.sql`LOWER(TRANSLATE(unaccent(CONCAT_WS(' ', COALESCE(c."firstName", ''), COALESCE(c."lastName", ''), COALESCE(c."displayName", ''), COALESCE(c."email", ''), COALESCE(c."phone", ''), COALESCE((SELECT string_agg(cn."content", ' ') FROM "candidate_note" cn WHERE cn."candidateId" = c."id" AND cn."organizationId" = c."organizationId"), ''))), 'đĐ', 'dd'))`
        : Prisma.sql`LOWER(TRANSLATE(unaccent(CONCAT_WS(' ', COALESCE(c."firstName", ''), COALESCE(c."lastName", ''), COALESCE(c."displayName", ''), COALESCE(c."email", ''), COALESCE(c."phone", ''))), 'đĐ', 'dd'))`;

      const tokenClauses = tokens.map((token) => {
        if (/^[a-z]+$/.test(token)) {
          const pattern = `(^|[^[:alnum:]])${escapePostgresRegex(token)}`;
          return Prisma.sql`(${targetExpr} ~ ${pattern})`;
        }
        const likePattern = `%${escapeSqlLike(token)}%`;
        return Prisma.sql`(${targetExpr} LIKE ${likePattern} ESCAPE '\\')`;
      });

      const orgClause = options.organizationId
        ? Prisma.sql`c."organizationId" = ${options.organizationId}`
        : Prisma.sql`TRUE`;

      const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT c."id"
        FROM "candidate" c
        WHERE ${orgClause}
          AND c."deletedAt" IS NULL
          AND (${Prisma.join(tokenClauses, " AND ")})
      `);

      return rows.map((r) => r.id);
    } catch {
      // Fall through to in-memory matcher when running without Postgres unaccent.
    }
  }

  const organizationId = options.organizationId ?? undefined;
  const candidates = await prisma.candidate.findMany({
    where: {
      ...(organizationId ? { organizationId } : {}),
      deletedAt: null,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      email: true,
      phone: true,
    },
  });

  const notesByCandidate = new Map<string, string[]>();
  if (options.includeNotes && candidates.length > 0) {
    const notes = await prisma.candidateNote.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        candidateId: { in: candidates.map((c) => c.id) },
      },
      select: {
        candidateId: true,
        content: true,
      },
    });
    for (const note of notes) {
      const list = notesByCandidate.get(note.candidateId) ?? [];
      list.push(note.content);
      notesByCandidate.set(note.candidateId, list);
    }
  }

  return candidates
    .filter((candidate) =>
      matchesPersonNameSearch(
        {
          ...candidate,
          extraFields: notesByCandidate.get(candidate.id),
        },
        options.rawSearch,
      ),
    )
    .map((candidate) => candidate.id);
}
