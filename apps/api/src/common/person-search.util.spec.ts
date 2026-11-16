import { describe, expect, it, vi } from "vitest";
import {
  foldVietnameseAccents,
  formatUserDisplayName,
  matchesPersonNameSearch,
  splitFullName,
} from "@haihire/shared";
import type { PrismaService } from "../prisma/prisma.service";
import { findMatchingCandidateIds } from "./person-search.util";

describe("Person Name Normalization & Smart Search", () => {
  describe("Shared Vietnamese & token-order helpers", () => {
    it("folds Vietnamese diacritics including đ/Đ and NFD combining marks", () => {
      expect(foldVietnameseAccents("Đặng Quốc Huy")).toBe("dang quoc huy");
      expect(foldVietnameseAccents("Nguyễn Anh Tuấn")).toBe("nguyen anh tuan");
      expect(foldVietnameseAccents("Nguy\u00ea\u0303n V\u0103n A\u0301n")).toBe(
        "nguyen van an",
      );
    });

    it("splits full name into firstName and lastName preserving multi-word surname/middle", () => {
      expect(splitFullName("Nguyễn Văn An")).toEqual({
        firstName: "An",
        lastName: "Nguyễn Văn",
      });
      expect(splitFullName("Abe Takamoto")).toEqual({
        firstName: "Takamoto",
        lastName: "Abe",
      });
      expect(splitFullName("Alice")).toEqual({
        firstName: "Alice",
        lastName: "",
      });
    });

    it("formats user display name respecting FIRST_LAST and LAST_FIRST", () => {
      const user = { firstName: "Tuấn", lastName: "Nguyễn Anh" };
      expect(formatUserDisplayName(user, "FIRST_LAST")).toBe("Tuấn Nguyễn Anh");
      expect(formatUserDisplayName(user, "LAST_FIRST")).toBe("Nguyễn Anh Tuấn");
    });

    it("matches token-order-independent and accent-insensitive queries with word boundaries", () => {
      const abe = {
        firstName: "Takamoto",
        lastName: "Abe",
        email: "abe.takamoto@example.com",
      };
      expect(matchesPersonNameSearch(abe, "Abe Takamoto")).toBe(true);
      expect(matchesPersonNameSearch(abe, "Takamoto Abe")).toBe(true);
      expect(matchesPersonNameSearch(abe, "takamoto")).toBe(true);

      const an = {
        firstName: "An",
        lastName: "Nguyễn Văn",
        email: "an.nguyen@example.com",
      };
      const binh = {
        firstName: "Bình",
        lastName: "Trần Văn",
        email: "binh.tran@example.com",
      };
      expect(matchesPersonNameSearch(an, "nguyen an")).toBe(true);
      expect(matchesPersonNameSearch(an, "an nguyen")).toBe(true);
      expect(matchesPersonNameSearch(an, "Nguyễn Văn An")).toBe(true);
      expect(matchesPersonNameSearch(binh, "an")).toBe(false);

      const huy = {
        firstName: "Huy",
        lastName: "Đặng Quốc",
        email: "huy@example.com",
      };
      expect(matchesPersonNameSearch(huy, "dang huy")).toBe(true);
      expect(matchesPersonNameSearch(huy, "Huy Đặng")).toBe(true);
    });
  });

  describe("findMatchingCandidateIds", () => {
    const sampleCandidates = [
      {
        id: "cand-abe",
        firstName: "Takamoto",
        lastName: "Abe",
        displayName: null,
        email: "abe.takamoto@example.com",
        phone: "0901112222",
      },
      {
        id: "cand-an",
        firstName: "An",
        lastName: "Nguyễn Văn",
        displayName: null,
        email: "an.nguyen@example.com",
        phone: "0903334444",
      },
      {
        id: "cand-binh",
        firstName: "Bình",
        lastName: "Trần Văn",
        displayName: null,
        email: "binh.tran@example.com",
        phone: "0905556666",
      },
      {
        id: "cand-huy",
        firstName: "Huy",
        lastName: "Đặng Quốc",
        displayName: null,
        email: "huy.dang@example.com",
        phone: "0907778888",
      },
    ];

    const createMockPrisma = () =>
      ({
        candidate: {
          findMany: vi.fn().mockResolvedValue(sampleCandidates),
        },
        candidateNote: {
          findMany: vi.fn().mockResolvedValue([
            {
              candidateId: "cand-binh",
              content: "Rất giỏi NestJS và PostgreSQL",
            },
          ]),
        },
      }) as unknown as PrismaService;

    it("falls back cleanly to JS smart search when $queryRaw is unavailable", async () => {
      const prisma = createMockPrisma();

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "Takamoto Abe",
        }),
      ).resolves.toEqual(["cand-abe"]);

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "Abe Takamoto",
        }),
      ).resolves.toEqual(["cand-abe"]);

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "nguyen an",
        }),
      ).resolves.toEqual(["cand-an"]);

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "dang huy",
        }),
      ).resolves.toEqual(["cand-huy"]);

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "an",
        }),
      ).resolves.toEqual(["cand-an"]);
    });

    it("searches candidate notes when includeNotes is true", async () => {
      const prisma = createMockPrisma();

      await expect(
        findMatchingCandidateIds(prisma, {
          organizationId: "org-1",
          rawSearch: "gioi nestjs",
          includeNotes: true,
        }),
      ).resolves.toEqual(["cand-binh"]);
    });

    it("uses parameterized $queryRaw when available on PrismaService", async () => {
      const queryRawMock = vi.fn().mockResolvedValue([{ id: "cand-abe" }]);
      const prisma = {
        $queryRaw: queryRawMock,
        candidate: { findMany: vi.fn() },
      } as unknown as PrismaService;

      const ids = await findMatchingCandidateIds(prisma, {
        organizationId: "org-1",
        rawSearch: "Abe Takamoto",
      });

      expect(ids).toEqual(["cand-abe"]);
      expect(queryRawMock).toHaveBeenCalledTimes(1);
    });
  });
});
