import { describe, expect, it } from "vitest";
import {
  createQueryBuilder,
  createMockTable,
  evaluatePredicate,
} from "./prisma-composer-mock";

interface TestItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isActive: boolean;
  [key: string]: unknown;
}

describe("prisma-composer-mock helper", () => {
  const sampleData: TestItem[] = [
    { id: "1", name: "Apple", category: "Fruit", price: 10, isActive: true },
    { id: "2", name: "Banana", category: "Fruit", price: 5, isActive: false },
    {
      id: "3",
      name: "Carrot",
      category: "Vegetable",
      price: 8,
      isActive: true,
    },
    { id: "4", name: "Donut", category: "Bakery", price: 15, isActive: true },
  ];

  describe("evaluatePredicate", () => {
    it("evaluates eq and in operators with wrapResult", () => {
      const item = { id: "1", role: "ADMIN" };
      expect(
        evaluatePredicate(item, (p) =>
          (p as { role: { eq: (val: string) => unknown } }).role.eq("ADMIN"),
        ),
      ).toBe(true);
      expect(
        evaluatePredicate(item, (p) =>
          (p as { role: { eq: (val: string) => unknown } }).role.eq("USER"),
        ),
      ).toBe(false);
      expect(
        evaluatePredicate(item, (p) =>
          (p as { role: { in: (vals: string[]) => unknown } }).role.in([
            "ADMIN",
            "SUPERADMIN",
          ]),
        ),
      ).toBe(true);
    });

    it("evaluates direct boolean predicates", () => {
      const item: TestItem = {
        id: "1",
        name: "Apple",
        category: "Fruit",
        price: 10,
        isActive: true,
      };
      expect(evaluatePredicate(item, (r) => r.price > 5)).toBe(true);
      expect(evaluatePredicate(item, (r) => r.price > 20)).toBe(false);
    });
  });

  describe("QueryBuilder", () => {
    it("supports select, where, all, first", async () => {
      const store = [...sampleData];
      const qb = createQueryBuilder(store);

      const allItems = await qb.all();
      expect(allItems).toHaveLength(4);

      const fruits = await qb.where((r) => r.category === "Fruit").all();
      expect(fruits).toHaveLength(2);

      const selected = await createQueryBuilder(store)
        .select("id", "name")
        .where((r) => r.id === "1")
        .first();
      expect(selected).toEqual({ id: "1", name: "Apple" });

      const nonExistent = await createQueryBuilder(store)
        .where((r) => r.id === "999")
        .first();
      expect(nonExistent).toBeNull();
    });

    it("supports update, create, count, delete", async () => {
      const store = [...sampleData];
      const qb = createQueryBuilder(store);

      const countBefore = await qb.count();
      expect(countBefore).toBe(4);

      const created = await qb.create({
        id: "5",
        name: "Eggplant",
        category: "Vegetable",
        price: 12,
        isActive: true,
      });
      expect(created.id).toBe("5");
      expect(store).toHaveLength(5);

      const updated = await createQueryBuilder(store)
        .where((r) => r.id === "5")
        .update({ price: 14 });
      expect(updated?.price).toBe(14);

      const deleteRes = await createQueryBuilder(store)
        .where((r) => r.id === "5")
        .delete();
      expect(deleteRes.count).toBe(1);
      expect(store).toHaveLength(4);
    });

    it("supports orderBy, skip, take", async () => {
      const store = [...sampleData];

      const sortedAsc = await createQueryBuilder(store)
        .orderBy("price", "asc")
        .all();
      expect(sortedAsc.map((i) => i.price)).toEqual([5, 8, 10, 15]);

      const sortedDesc = await createQueryBuilder(store)
        .orderBy("price", "desc")
        .all();
      expect(sortedDesc.map((i) => i.price)).toEqual([15, 10, 8, 5]);

      const paged = await createQueryBuilder(store)
        .orderBy("price", "asc")
        .skip(1)
        .take(2)
        .all();
      expect(paged.map((i) => i.price)).toEqual([8, 10]);
    });
  });

  describe("createMockTable", () => {
    it("creates an in-memory table supporting select, where, and create", async () => {
      const table = createMockTable<TestItem>(sampleData);
      expect(await table.count()).toBe(4);

      const item = await table
        .where((r) => r.id === "2")
        .select("id", "price")
        .first();
      expect(item).toEqual({ id: "2", price: 5 });

      const newItem = await table.create({
        id: "6",
        name: "Fig",
        category: "Fruit",
        price: 20,
        isActive: true,
      });
      expect(newItem.id).toBe("6");
      expect(await table.count()).toBe(5);
    });
  });
});
