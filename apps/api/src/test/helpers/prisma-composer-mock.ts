import { vi } from "vitest";
import type { PrismaService } from "../../prisma/prisma.service";

export type MockRecord = Record<string, unknown>;

export interface ProxyField {
  eq: (target: unknown) => { and: (other: unknown) => unknown; value: boolean };
  in: (targets: unknown[]) => {
    and: (other: unknown) => unknown;
    value: boolean;
  };
  is: (target: unknown) => { and: (other: unknown) => unknown; value: boolean };
  neq: (target: unknown) => {
    and: (other: unknown) => unknown;
    value: boolean;
  };
  gte: (target: unknown) => {
    and: (other: unknown) => unknown;
    value: boolean;
  };
  lte: (target: unknown) => {
    and: (other: unknown) => unknown;
    value: boolean;
  };
  gt: (target: unknown) => { and: (other: unknown) => unknown; value: boolean };
  lt: (target: unknown) => { and: (other: unknown) => unknown; value: boolean };
  isNull: () => { and: (other: unknown) => unknown; value: boolean };
  isNotNull: () => { and: (other: unknown) => unknown; value: boolean };
}

export type ProxyRecord = Record<string, ProxyField>;

export type PredicateFn<T = MockRecord> =
  ((proxy: ProxyRecord) => unknown) | ((record: T) => boolean);

export interface QueryBuilder<T = MockRecord> {
  select(...fields: string[]): QueryBuilder<T>;
  where(predicate: PredicateFn<T>): QueryBuilder<T>;
  all(): Promise<T[]>;
  first(): Promise<T | null>;
  update(patch: Partial<T>): Promise<T | null>;
  updateAll(patch: Partial<T>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  upsert(args: {
    create: Partial<T>;
    update: Partial<T>;
    conflictOn?: Record<string, unknown>;
  }): Promise<T>;
  count(): Promise<number>;
  delete(): Promise<{ count: number }>;
  deleteAll(): Promise<{ count: number }>;
  orderBy(field: string, direction?: "asc" | "desc"): QueryBuilder<T>;
  skip(n: number): QueryBuilder<T>;
  take(n: number): QueryBuilder<T>;
}

export interface MockTable<T = MockRecord> {
  // Legacy query builder methods
  select(...fields: string[]): QueryBuilder<T>;
  where(predicate: PredicateFn<T>): QueryBuilder<T>;
  create(data: Partial<T> | { data: Partial<T> }): Promise<T>;
  upsert(args: {
    create: Partial<T>;
    update: Partial<T>;
    conflictOn?: Record<string, unknown>;
    where?: Record<string, unknown>;
  }): Promise<T>;
  count(args?: { where?: unknown }): Promise<number>;
  store: T[];
  // Canonical Prisma Client methods
  findMany(args?: {
    where?: unknown;
    select?: unknown;
    include?: unknown;
    skip?: number;
    take?: number;
    orderBy?: unknown;
  }): Promise<T[]>;
  findFirst(args?: {
    where?: unknown;
    select?: unknown;
    include?: unknown;
    orderBy?: unknown;
  }): Promise<T | null>;
  findUnique(args?: {
    where?: unknown;
    select?: unknown;
    include?: unknown;
  }): Promise<T | null>;
  update(args: Partial<T> | { where?: unknown; data: Partial<T> }): Promise<T>;
  updateMany(args?: { where?: unknown; data: Partial<T> }): Promise<{ count: number }>;
  delete(args: { where: unknown }): Promise<T>;
  deleteMany(args?: { where?: unknown }): Promise<{ count: number }>;
}

interface WrappedResult {
  and: (other: WrappedResult | boolean) => WrappedResult;
  value: boolean;
}

function wrapResult(val: boolean): WrappedResult {
  return {
    and: (other: WrappedResult | boolean) =>
      wrapResult(val && (typeof other === "boolean" ? other : other.value)),
    value: val,
  };
}

export function evaluatePredicate<T extends MockRecord>(
  item: T,
  pred?: ((proxy: ProxyRecord) => unknown) | ((record: NoInfer<T>) => boolean),
): boolean {
  if (!pred) return true;

  const proxy = new Proxy({} as Record<string, unknown>, {
    get: (_, prop: string) => {
      const fieldVal = item[prop];
      return {
        eq: (target: unknown) => wrapResult(fieldVal === target),
        in: (targets: unknown[]) =>
          wrapResult(Array.isArray(targets) && targets.includes(fieldVal)),
        is: (target: unknown) => wrapResult(fieldVal === target),
        neq: (target: unknown) => wrapResult(fieldVal !== target),
        gte: (target: unknown) =>
          wrapResult(
            fieldVal !== undefined &&
              fieldVal !== null &&
              (fieldVal as number | string | Date) >=
                (target as number | string | Date),
          ),
        lte: (target: unknown) =>
          wrapResult(
            fieldVal !== undefined &&
              fieldVal !== null &&
              (fieldVal as number | string | Date) <=
                (target as number | string | Date),
          ),
        gt: (target: unknown) =>
          wrapResult(
            fieldVal !== undefined &&
              fieldVal !== null &&
              (fieldVal as number | string | Date) >
                (target as number | string | Date),
          ),
        lt: (target: unknown) =>
          wrapResult(
            fieldVal !== undefined &&
              fieldVal !== null &&
              (fieldVal as number | string | Date) <
                (target as number | string | Date),
          ),
        isNull: () => wrapResult(fieldVal === null || fieldVal === undefined),
        isNotNull: () =>
          wrapResult(fieldVal !== null && fieldVal !== undefined),
      };
    },
  });

  try {
    const res = (pred as (p: unknown) => unknown)(proxy);
    if (res && typeof res === "object" && "value" in res) {
      return Boolean((res as { value: boolean }).value);
    }
  } catch {
    // Fall back to direct invocation
  }

  try {
    const directRes = (pred as (r: T) => boolean)(item);
    if (typeof directRes === "boolean") {
      return directRes;
    }
  } catch {
    // If evaluation fails, default to match
  }

  return true;
}

interface QueryBuilderState {
  fields: string[];
  predicates: PredicateFn<MockRecord>[];
  sortField?: string;
  sortDirection: "asc" | "desc";
  skipCount?: number;
  takeCount?: number;
}

function projectRecord<T>(record: T, fields: string[]): T {
  if (fields.length === 0) {
    return { ...record };
  }
  const result: Record<string, unknown> = {};
  const rec = record as unknown as Record<string, unknown>;
  for (const f of fields) {
    if (f in rec) {
      result[f] = rec[f];
    }
  }
  return result as unknown as T;
}

export function createQueryBuilder<T = MockRecord>(
  store: T[],
  state: QueryBuilderState = {
    fields: [],
    predicates: [],
    sortDirection: "asc",
  },
): QueryBuilder<T> {
  return {
    select(...fields: string[]): QueryBuilder<T> {
      return createQueryBuilder(store, {
        ...state,
        fields: [...state.fields, ...fields],
      });
    },

    where(predicate: PredicateFn<T>): QueryBuilder<T> {
      return createQueryBuilder(store, {
        ...state,
        predicates: [...state.predicates, predicate as unknown as PredicateFn<MockRecord>],
      });
    },

    async all(): Promise<T[]> {
      let filtered = store.filter((item) =>
        state.predicates.every((p) => evaluatePredicate(item as MockRecord, p)),
      );

      if (state.sortField) {
        const sf = state.sortField;
        const dir = state.sortDirection === "desc" ? -1 : 1;
        filtered = [...filtered].sort((a, b) => {
          const valA = (a as MockRecord)[sf];
          const valB = (b as MockRecord)[sf];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          return valA > valB ? dir : -dir;
        });
      }

      if (state.skipCount && state.skipCount > 0) {
        filtered = filtered.slice(state.skipCount);
      }

      if (state.takeCount !== undefined && state.takeCount >= 0) {
        filtered = filtered.slice(0, state.takeCount);
      }

      return filtered.map((item) => projectRecord(item, state.fields));
    },

    async first(): Promise<T | null> {
      let filtered = store.filter((item) =>
        state.predicates.every((p) => evaluatePredicate(item as MockRecord, p)),
      );

      if (state.sortField) {
        const sf = state.sortField;
        const dir = state.sortDirection === "desc" ? -1 : 1;
        filtered = [...filtered].sort((a, b) => {
          const valA = (a as MockRecord)[sf];
          const valB = (b as MockRecord)[sf];
          if (valA === valB) return 0;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          return valA > valB ? dir : -dir;
        });
      }

      if (state.skipCount && state.skipCount > 0) {
        filtered = filtered.slice(state.skipCount);
      }

      const match = filtered[0];
      if (!match) return null;
      return projectRecord(match, state.fields);
    },

    async update(patch: Partial<T>): Promise<T | null> {
      const match = store.find((item) =>
        state.predicates.every((p) => evaluatePredicate(item as MockRecord, p)),
      );
      if (match) {
        Object.assign(match, patch);
        return projectRecord(match, state.fields);
      }
      return null;
    },

    async updateAll(patch: Partial<T>): Promise<T[]> {
      const updatedRows: T[] = [];
      for (const item of store) {
        if (state.predicates.every((p) => evaluatePredicate(item as MockRecord, p))) {
          Object.assign(item as object, patch);
          updatedRows.push(projectRecord(item, state.fields));
        }
      }
      return updatedRows;
    },

    async create(data: Partial<T>): Promise<T> {
      const record = { ...data } as T;
      store.push(record);
      return projectRecord(record, state.fields);
    },

    async upsert(args: {
      create: Partial<T>;
      update: Partial<T>;
      conflictOn?: Record<string, unknown>;
    }): Promise<T> {
      let match: T | undefined;
      if (args.conflictOn) {
        match = store.find((item) =>
          Object.entries(args.conflictOn!).every(([k, v]) => (item as MockRecord)[k] === v),
        );
      }
      if (match) {
        Object.assign(match, args.update);
        return match;
      } else {
        const record = { ...args.create } as T;
        store.push(record);
        return record;
      }
    },
    async count(): Promise<number> {
      const filtered = store.filter((item) =>
        state.predicates.every((p) => evaluatePredicate(item as MockRecord, p)),
      );
      return filtered.length;
    },

    async delete(): Promise<{ count: number }> {
      let removedCount = 0;
      for (let i = store.length - 1; i >= 0; i--) {
        const item = store[i];
        if (item && state.predicates.every((p) => evaluatePredicate(item as MockRecord, p))) {
          store.splice(i, 1);
          removedCount++;
        }
      }
      return { count: removedCount };
    },

    async deleteAll(): Promise<{ count: number }> {
      let removedCount = 0;
      for (let i = store.length - 1; i >= 0; i--) {
        const item = store[i];
        if (item && state.predicates.every((p) => evaluatePredicate(item as MockRecord, p))) {
          store.splice(i, 1);
          removedCount++;
        }
      }
      return { count: removedCount };
    },

    orderBy(field: string, direction: "asc" | "desc" = "asc"): QueryBuilder<T> {
      return createQueryBuilder(store, {
        ...state,
        sortField: field,
        sortDirection: direction,
      });
    },

    skip(n: number): QueryBuilder<T> {
      return createQueryBuilder(store, {
        ...state,
        skipCount: n,
      });
    },

    take(n: number): QueryBuilder<T> {
      return createQueryBuilder(store, {
        ...state,
        takeCount: n,
      });
    },
  };
}

export function matchPrismaWhere<T extends MockRecord>(item: T, where?: unknown): boolean {
  if (!where || typeof where !== "object") return true;
  for (const [key, val] of Object.entries(where as Record<string, unknown>)) {
    if (key === "AND") {
      const arr = Array.isArray(val) ? val : [val];
      if (!arr.every((w) => matchPrismaWhere(item, w))) return false;
      continue;
    }
    if (key === "OR") {
      const arr = Array.isArray(val) ? val : [val];
      if (!arr.some((w) => matchPrismaWhere(item, w))) return false;
      continue;
    }
    if (key === "NOT") {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.some((w) => matchPrismaWhere(item, w))) return false;
      continue;
    }
    const itemVal = item[key];
    if (val === null) {
      if (itemVal !== null && itemVal !== undefined) return false;
      continue;
    }
    if (typeof val === "object" && !(val instanceof Date)) {
      if ("in" in val && (!Array.isArray(val.in) || !val.in.includes(itemVal))) return false;
      if ("notIn" in val && Array.isArray(val.notIn) && val.notIn.includes(itemVal)) return false;
      if ("equals" in val && itemVal !== val.equals) return false;
      if ("not" in val && itemVal === val.not) return false;
      const v = val as Record<string, unknown>;
      if ("contains" in v) {
        const str = String(itemVal ?? "");
        const target = String(v.contains ?? "");
        if (v.mode === "insensitive") {
          if (!str.toLowerCase().includes(target.toLowerCase())) return false;
        } else {
          if (!str.includes(target)) return false;
        }
      }
      if ("gte" in v && !(Number(itemVal) >= Number(v.gte))) return false;
      if ("lte" in v && !(Number(itemVal) <= Number(v.lte))) return false;
      if ("gt" in v && !(Number(itemVal) > Number(v.gt))) return false;
      if ("lt" in v && !(Number(itemVal) < Number(v.lt))) return false;
      continue;
    }
    if (itemVal !== val) return false;
  }
  return true;
}

export function projectPrismaSelect<T>(item: T, select?: unknown): T {
  if (!select || typeof select !== "object") return { ...item };
  const res: Record<string, unknown> = {};
  const itemObj = item as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(select as Record<string, unknown>)) {
    if (v) res[k] = itemObj[k];
  }
  return res as unknown as T;
}

export function createMockTable<T = MockRecord>(
  initialItems: T[] = [],
): MockTable<T> {
  const store = initialItems;

  const table: MockTable<T> = {
    store,
    select: vi.fn((...fields: string[]): QueryBuilder<T> => {
      return createQueryBuilder(store).select(...fields);
    }),
    where: vi.fn((predicate: PredicateFn<T>): QueryBuilder<T> => {
      return createQueryBuilder(store).where(predicate);
    }),
    create: vi.fn(async (data: Partial<T> | { data: Partial<T> }): Promise<T> => {
      const payload = data && typeof data === "object" && "data" in data && (data as { data: Partial<T> }).data ? (data as { data: Partial<T> }).data : data;
      const record = { ...payload } as T;
      store.push(record);
      return { ...record };
    }),
    upsert: vi.fn(async (args: {
      create: Partial<T>;
      update: Partial<T>;
      conflictOn?: Record<string, unknown>;
      where?: Record<string, unknown>;
    }): Promise<T> => {
      const conflictCriteria = args.conflictOn || args.where;
      let match: T | undefined;
      if (conflictCriteria) {
        match = store.find((item) =>
          Object.entries(conflictCriteria).every(([k, v]) => (item as MockRecord)[k] === v),
        );
      }
      if (match) {
        Object.assign(match, args.update);
        return { ...match };
      } else {
        const record = { ...args.create } as T;
        store.push(record);
        return { ...record };
      }
    }),
    count: vi.fn(async (args?: { where?: unknown }): Promise<number> => {
      if (!args?.where) return store.length;
      return store.filter((item) => matchPrismaWhere(item as MockRecord, args.where)).length;
    }),
    findMany: vi.fn(async (args?: {
      where?: unknown;
      select?: unknown;
      include?: unknown;
      skip?: number;
      take?: number;
      orderBy?: unknown;
    }): Promise<T[]> => {
      let filtered = store.filter((item) => matchPrismaWhere(item as MockRecord, args?.where));
      if (args?.orderBy) {
        const [sortKey, sortDir] = Object.entries(args.orderBy)[0] || [];
        if (sortKey) {
          filtered.sort((a, b) => {
            const va = (a as MockRecord)[sortKey];
            const vb = (b as MockRecord)[sortKey];
            const sa = String(va ?? "");
            const sb = String(vb ?? "");
            if (sa < sb) return sortDir === "desc" ? 1 : -1;
            if (sa > sb) return sortDir === "desc" ? -1 : 1;
            return 0;
          });
        }
      }
      if (args?.skip && args.skip > 0) filtered = filtered.slice(args.skip);
      if (args?.take !== undefined && args.take >= 0) filtered = filtered.slice(0, args.take);
      return filtered.map((item) => projectPrismaSelect(item, args?.select));
    }),
    findFirst: vi.fn(async (args?: {
      where?: unknown;
      select?: unknown;
      include?: unknown;
      orderBy?: unknown;
    }): Promise<T | null> => {
      const results = await table.findMany({ ...args, take: 1 });
      return results[0] || null;
    }),
    findUnique: vi.fn(async (args?: {
      where?: unknown;
      select?: unknown;
      include?: unknown;
    }): Promise<T | null> => {
      return table.findFirst(args);
    }),
    update: vi.fn(async (args: Partial<T> | { where?: unknown; data: Partial<T> }): Promise<T> => {
      const isWrapped = args && typeof args === "object" && "data" in args && "where" in args;
      const where = isWrapped ? (args as { where?: unknown }).where : undefined;
      const data = isWrapped ? (args as { data: Partial<T> }).data : (args as Partial<T>);
      const target = where ? store.find((item) => matchPrismaWhere(item as MockRecord, where)) : store[0];
      if (target) {
        Object.assign(target, data);
        return { ...target };
      }
      return { ...data } as T;
    }),
    updateMany: vi.fn(async (args?: { where?: unknown; data: Partial<T> }): Promise<{ count: number }> => {
      let count = 0;
      for (const item of store) {
        if (matchPrismaWhere(item as MockRecord, args?.where)) {
          Object.assign(item as object, args?.data);
          count++;
        }
      }
      return { count };
    }),
    delete: vi.fn(async (args: { where: unknown }): Promise<T> => {
      const idx = store.findIndex((item) => matchPrismaWhere(item as MockRecord, args.where));
      if (idx !== -1) {
        const [removed] = store.splice(idx, 1);
        return removed;
      }
      return {} as T;
    }),
    deleteMany: vi.fn(async (args?: { where?: unknown }): Promise<{ count: number }> => {
      let count = 0;
      for (let i = store.length - 1; i >= 0; i--) {
        if (matchPrismaWhere(store[i] as MockRecord, args?.where)) {
          store.splice(i, 1);
          count++;
        }
      }
      return { count };
    }),
  };

  return table;
}

export function createMockPrismaService(tableMap: Record<string, unknown> = {}): PrismaService & { db: { orm: { public: Record<string, MockTable<object>> } }; client: { orm: { public: Record<string, MockTable<object>> } }; [key: string]: unknown } {
  const dynamicTables: Record<string, MockTable<object>> = {};

  const getTable = (prop: string): MockTable<object> => {
    const lower = prop.charAt(0).toLowerCase() + prop.slice(1);
    const upper = prop.charAt(0).toUpperCase() + prop.slice(1);
    const raw = tableMap[lower] || tableMap[upper];
    if (raw) {
      if (Array.isArray(raw)) {
        if (!dynamicTables[lower]) {
          dynamicTables[lower] = createMockTable(raw);
        }
        return dynamicTables[lower];
      }
      return raw as MockTable<object>;
    }
    if (dynamicTables[lower]) return dynamicTables[lower];
    dynamicTables[lower] = createMockTable();
    return dynamicTables[lower];
  };

  const ormProxy = new Proxy({}, {
    get: (_, modelName: string) => getTable(modelName),
  });

  const dbProxy = {
    orm: {
      public: ormProxy,
    },
  };

  const proxyTarget: Record<string, unknown> = {
    db: dbProxy,
    client: dbProxy,
    orm: dbProxy.orm,
  };

  const proxyInstance = new Proxy(proxyTarget, {
    get: (target, prop: string) => {
      if (prop in target) return target[prop];
      return getTable(prop);
    },
  });

  const txSpy = vi.fn(async (fn: unknown) => {
    if (typeof fn === "function") return (fn as (client: unknown) => unknown)(proxyInstance);
    if (Array.isArray(fn)) return Promise.all(fn);
    return fn;
  });

  proxyTarget.$transaction = txSpy;
  proxyTarget.transaction = txSpy;
  proxyTarget.executeTx = txSpy;

  return proxyInstance as unknown as PrismaService & {
    db: { orm: { public: Record<string, MockTable<object>> } };
    client: { orm: { public: Record<string, MockTable<object>> } };
    [key: string]: unknown;
  };
}
