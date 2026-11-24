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
  createMany(args?: {
    data: Array<Partial<T>>;
    skipDuplicates?: boolean;
  }): Promise<{ count: number }>;
  upsert(args: {
    create: Partial<T>;
    update: Partial<T>;
    conflictOn?: Record<string, unknown>;
    where?: Record<string, unknown>;
  }): Promise<T>;
  count(args?: { where?: unknown }): Promise<number>;
  groupBy(args: {
    by: string[];
    where?: unknown;
    _count?: boolean | Record<string, boolean>;
  }): Promise<Array<Record<string, unknown>>>;
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
  updateMany(args?: {
    where?: unknown;
    data: Partial<T>;
  }): Promise<{ count: number }>;
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
        predicates: [
          ...state.predicates,
          predicate as unknown as PredicateFn<MockRecord>,
        ],
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
        if (
          state.predicates.every((p) =>
            evaluatePredicate(item as MockRecord, p),
          )
        ) {
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
          Object.entries(args.conflictOn!).every(
            ([k, v]) => (item as MockRecord)[k] === v,
          ),
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
        if (
          item &&
          state.predicates.every((p) =>
            evaluatePredicate(item as MockRecord, p),
          )
        ) {
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
        if (
          item &&
          state.predicates.every((p) =>
            evaluatePredicate(item as MockRecord, p),
          )
        ) {
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

const SCALAR_FILTER_KEYS = new Set([
  "in",
  "notIn",
  "equals",
  "not",
  "contains",
  "startsWith",
  "endsWith",
  "mode",
  "gte",
  "lte",
  "gt",
  "lt",
]);

type RelationResolver = (
  modelName: string,
  item: MockRecord,
  relKey: string,
) => unknown;

interface MatchContext {
  modelName?: string;
  resolveRelation?: RelationResolver;
}

const RELATION_TARGET_MODEL: Record<string, Record<string, string>> = {
  candidate: {
    applications: "application",
    documents: "candidateDocument",
    candidateNotes: "candidateNote",
    organization: "organization",
  },
  application: {
    candidate: "candidate",
    job: "job",
    interviews: "interview",
    applicationNotes: "applicationNote",
    organization: "organization",
  },
  job: {
    applications: "application",
    organization: "organization",
  },
  interview: {
    application: "application",
    organization: "organization",
  },
};

const tableRelationMeta = new WeakMap<
  object,
  { modelName: string; resolveRelation: RelationResolver }
>();

function inferChildModel(
  modelName: string | undefined,
  key: string,
): string | undefined {
  if (!modelName) return undefined;
  return RELATION_TARGET_MODEL[modelName]?.[key];
}

function resolveFieldOrRelation(
  item: MockRecord,
  key: string,
  context?: MatchContext,
): unknown {
  if (item[key] !== undefined) return item[key];
  if (context?.modelName && context?.resolveRelation) {
    return context.resolveRelation(context.modelName, item, key);
  }
  return undefined;
}

function isCompositeUniqueWhereKey(
  key: string,
  val: Record<string, unknown>,
): boolean {
  const keys = Object.keys(val);
  if (keys.length < 2 || !key.includes("_")) return false;
  const parts = key.split("_");
  return keys.every(
    (k) =>
      parts.includes(k) ||
      key.startsWith(`${k}_`) ||
      key.includes(`_${k}_`) ||
      key.endsWith(`_${k}`),
  );
}

export function matchPrismaWhere<T extends MockRecord>(
  item: T,
  where?: unknown,
  context?: MatchContext,
): boolean {
  if (!where || typeof where !== "object") return true;
  for (const [key, val] of Object.entries(where as Record<string, unknown>)) {
    if (key === "AND") {
      const arr = Array.isArray(val) ? val : [val];
      if (!arr.every((w) => matchPrismaWhere(item, w, context))) return false;
      continue;
    }
    if (key === "OR") {
      const arr = Array.isArray(val) ? val : [val];
      if (!arr.some((w) => matchPrismaWhere(item, w, context))) return false;
      continue;
    }
    if (key === "NOT") {
      const arr = Array.isArray(val) ? val : [val];
      if (arr.some((w) => matchPrismaWhere(item, w, context))) return false;
      continue;
    }
    const itemVal = resolveFieldOrRelation(item, key, context);
    if (val === null) {
      if (itemVal !== null && itemVal !== undefined) return false;
      continue;
    }
    if (typeof val === "object" && !(val instanceof Date)) {
      if (!Array.isArray(val)) {
        const objVal = val as Record<string, unknown>;
        const objKeys = Object.keys(objVal);
        const hasScalarOperator = objKeys.some((k) =>
          SCALAR_FILTER_KEYS.has(k),
        );
        if (!hasScalarOperator && objKeys.length > 0) {
          if (itemVal === undefined && isCompositeUniqueWhereKey(key, objVal)) {
            if (!matchPrismaWhere(item, objVal, context)) return false;
            continue;
          }
          const childCtx: MatchContext | undefined = context?.resolveRelation
            ? {
                modelName: inferChildModel(context.modelName, key),
                resolveRelation: context.resolveRelation,
              }
            : undefined;
          if (Array.isArray(itemVal)) {
            if (
              "some" in objVal &&
              !itemVal.some((child) =>
                matchPrismaWhere(child as MockRecord, objVal.some, childCtx),
              )
            ) {
              return false;
            }
            if (
              "none" in objVal &&
              itemVal.some((child) =>
                matchPrismaWhere(child as MockRecord, objVal.none, childCtx),
              )
            ) {
              return false;
            }
            if (
              "every" in objVal &&
              !itemVal.every((child) =>
                matchPrismaWhere(child as MockRecord, objVal.every, childCtx),
              )
            ) {
              return false;
            }
            continue;
          }
          if ("is" in objVal) {
            if (objVal.is === null) {
              if (itemVal !== null && itemVal !== undefined) return false;
            } else if (
              itemVal !== undefined &&
              (itemVal === null ||
                !matchPrismaWhere(itemVal as MockRecord, objVal.is, childCtx))
            ) {
              return false;
            }
            continue;
          }
          if ("isNot" in objVal) {
            if (objVal.isNot === null) {
              if (itemVal === null) return false;
            } else if (
              itemVal &&
              typeof itemVal === "object" &&
              matchPrismaWhere(itemVal as MockRecord, objVal.isNot, childCtx)
            ) {
              return false;
            }
            continue;
          }
          if (itemVal === null) return false;
          if (
            itemVal &&
            typeof itemVal === "object" &&
            !(itemVal instanceof Date)
          ) {
            if (!matchPrismaWhere(itemVal as MockRecord, objVal, childCtx))
              return false;
          }
          continue;
        }
      }
      if ("in" in val && (!Array.isArray(val.in) || !val.in.includes(itemVal)))
        return false;
      if (
        "notIn" in val &&
        Array.isArray(val.notIn) &&
        val.notIn.includes(itemVal)
      )
        return false;
      if ("equals" in val && itemVal !== val.equals) return false;
      if (
        "not" in val &&
        (val.not === null
          ? itemVal === null || itemVal === undefined
          : itemVal === val.not)
      )
        return false;
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
      const toNumeric = (raw: unknown, ref: unknown) => {
        if (ref instanceof Date && typeof raw === "string") {
          const parsed = Date.parse(raw);
          if (!Number.isNaN(parsed)) return parsed;
        }
        return Number(raw);
      };
      if ("gte" in v && !(toNumeric(itemVal, v.gte) >= Number(v.gte)))
        return false;
      if ("lte" in v && !(toNumeric(itemVal, v.lte) <= Number(v.lte)))
        return false;
      if ("gt" in v && !(toNumeric(itemVal, v.gt) > Number(v.gt))) return false;
      if ("lt" in v && !(toNumeric(itemVal, v.lt) < Number(v.lt))) return false;
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

export function applyPrismaPatch<T extends object>(
  target: T,
  patch?: unknown,
): void {
  if (!patch || typeof patch !== "object") return;
  const targetObj = target as Record<string, unknown>;
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v instanceof Date)
    ) {
      const obj = v as Record<string, unknown>;
      if ("increment" in obj && typeof obj.increment === "number") {
        targetObj[k] = (Number(targetObj[k]) || 0) + obj.increment;
        continue;
      }
      if ("decrement" in obj && typeof obj.decrement === "number") {
        targetObj[k] = (Number(targetObj[k]) || 0) - obj.decrement;
        continue;
      }
    }
    targetObj[k] = v;
  }
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
    create: vi.fn(
      async (data: Partial<T> | { data: Partial<T> }): Promise<T> => {
        const payload =
          data &&
          typeof data === "object" &&
          "data" in data &&
          (data as { data: Partial<T> }).data
            ? (data as { data: Partial<T> }).data
            : data;
        const record = { ...payload } as Record<string, unknown>;
        for (const [k, v] of Object.entries(record)) {
          if (
            v &&
            typeof v === "object" &&
            (v.constructor?.name === "DbNull" ||
              (v as Record<string | symbol, unknown>)[
                Symbol.for("prisma.objectEnumValue")
              ])
          ) {
            record[k] = null;
          }
        }
        store.push(record as T);
        return { ...record } as T;
      },
    ),
    createMany: vi.fn(
      async (args?: {
        data: Array<Partial<T>>;
        skipDuplicates?: boolean;
      }): Promise<{ count: number }> => {
        const items = Array.isArray(args?.data) ? args.data : [];
        for (const item of items) {
          store.push({ ...item } as T);
        }
        return { count: items.length };
      },
    ),
    upsert: vi.fn(
      async (args: {
        create: Partial<T>;
        update: Partial<T>;
        conflictOn?: Record<string, unknown>;
        where?: Record<string, unknown>;
      }): Promise<T> => {
        const conflictCriteria = args.conflictOn || args.where;
        let match: T | undefined;
        if (conflictCriteria) {
          match = store.find((item) =>
            Object.entries(conflictCriteria).every(([k, v]) => {
              const rec = item as MockRecord;
              if (
                rec[k] === undefined &&
                v &&
                typeof v === "object" &&
                !Array.isArray(v) &&
                !(v instanceof Date) &&
                isCompositeUniqueWhereKey(k, v as Record<string, unknown>)
              ) {
                return Object.entries(v as Record<string, unknown>).every(
                  ([ck, cv]) => rec[ck] === cv,
                );
              }
              return rec[k] === v;
            }),
          );
        }
        if (match) {
          applyPrismaPatch(match as object, args.update);
          return { ...match };
        } else {
          const record = { ...args.create } as T;
          store.push(record);
          return { ...record };
        }
      },
    ),
    count: vi.fn(async (args?: { where?: unknown }): Promise<number> => {
      if (!args?.where) return store.length;
      const matchCtx = tableRelationMeta.get(table);
      return store.filter((item) =>
        matchPrismaWhere(item as MockRecord, args.where, matchCtx),
      ).length;
    }),
    groupBy: vi.fn(
      async (args: {
        by: string[];
        where?: unknown;
        _count?: boolean | Record<string, boolean>;
      }): Promise<Array<Record<string, unknown>>> => {
        const filtered = args.where
          ? store.filter((item) =>
              matchPrismaWhere(item as MockRecord, args.where),
            )
          : store;
        const groups = new Map<string, Record<string, unknown>>();
        for (const item of filtered) {
          const rec = item as MockRecord;
          const keyParts = args.by.map((field) => String(rec[field] ?? ""));
          const compositeKey = keyParts.join("\u0000");
          const existing = groups.get(compositeKey);
          if (existing) {
            const countObj = existing._count as Record<string, number>;
            countObj._all += 1;
          } else {
            const entry: Record<string, unknown> = {};
            for (const field of args.by) {
              entry[field] = rec[field];
            }
            entry._count = { _all: 1 };
            groups.set(compositeKey, entry);
          }
        }
        return Array.from(groups.values());
      },
    ),
    findMany: vi.fn(
      async (args?: {
        where?: unknown;
        select?: unknown;
        include?: unknown;
        skip?: number;
        take?: number;
        orderBy?: unknown;
      }): Promise<T[]> => {
        const matchCtx = tableRelationMeta.get(table);
        let filtered = store.filter((item) =>
          matchPrismaWhere(item as MockRecord, args?.where, matchCtx),
        );
        if (args?.orderBy) {
          type ScalarOrderSpec =
            string | { sort: string; nulls?: "first" | "last" };
          type NestedOrderSpec = Record<string, ScalarOrderSpec>;
          type OrderSpec = ScalarOrderSpec | NestedOrderSpec;

          const orderClauses: Array<[string, OrderSpec]> = Array.isArray(
            args.orderBy,
          )
            ? args.orderBy.flatMap((o: Record<string, OrderSpec>) =>
                Object.entries(o),
              )
            : Object.entries(args.orderBy as Record<string, OrderSpec>);

          const extractOrderTarget = (
            item: MockRecord,
            sortKey: string,
            rawSpec: OrderSpec,
          ): {
            val: unknown;
            sortDir: string;
            nullsOrder?: "first" | "last";
          } => {
            if (typeof rawSpec === "string") {
              return { val: item[sortKey], sortDir: rawSpec };
            }
            if (rawSpec && typeof rawSpec === "object" && "sort" in rawSpec) {
              const scalarSpec = rawSpec as {
                sort: string;
                nulls?: "first" | "last";
              };
              return {
                val: item[sortKey],
                sortDir: scalarSpec.sort ?? "asc",
                nullsOrder: scalarSpec.nulls,
              };
            }
            if (rawSpec && typeof rawSpec === "object") {
              const entries = Object.entries(rawSpec as NestedOrderSpec);
              if (entries.length > 0) {
                const [nestedKey, nestedSpec] = entries[0];
                const relVal = resolveFieldOrRelation(item, sortKey, matchCtx);
                if (nestedKey === "_count" && typeof nestedSpec === "string") {
                  return {
                    val: Array.isArray(relVal) ? relVal.length : 0,
                    sortDir: nestedSpec,
                  };
                }
                const relRecord =
                  relVal && typeof relVal === "object" && !Array.isArray(relVal)
                    ? (relVal as MockRecord)
                    : undefined;
                const val = relRecord ? relRecord[nestedKey] : undefined;
                if (typeof nestedSpec === "string") {
                  return { val, sortDir: nestedSpec };
                }
                return {
                  val,
                  sortDir: nestedSpec?.sort ?? "asc",
                  nullsOrder: nestedSpec?.nulls,
                };
              }
            }
            return { val: item[sortKey], sortDir: "asc" };
          };

          if (orderClauses.length > 0) {
            filtered.sort((a, b) => {
              for (const [sortKey, rawSpec] of orderClauses) {
                const aTarget = extractOrderTarget(
                  a as MockRecord,
                  sortKey,
                  rawSpec,
                );
                const bTarget = extractOrderTarget(
                  b as MockRecord,
                  sortKey,
                  rawSpec,
                );
                const { sortDir, nullsOrder } = aTarget;
                const va = aTarget.val;
                const vb = bTarget.val;
                const aIsNull = va === null || va === undefined;
                const bIsNull = vb === null || vb === undefined;
                if (nullsOrder && (aIsNull || bIsNull)) {
                  if (aIsNull && bIsNull) continue;
                  if (nullsOrder === "first") return aIsNull ? -1 : 1;
                  return aIsNull ? 1 : -1;
                }
                let cmp = 0;
                if (typeof va === "number" && typeof vb === "number") {
                  cmp = va - vb;
                } else if (va instanceof Date && vb instanceof Date) {
                  cmp = va.getTime() - vb.getTime();
                } else {
                  const sa = String(va ?? "");
                  const sb = String(vb ?? "");
                  cmp = sa < sb ? -1 : sa > sb ? 1 : 0;
                }
                if (cmp !== 0) return sortDir === "desc" ? -cmp : cmp;
              }
              return 0;
            });
          }
        }
        if (args?.skip && args.skip > 0) filtered = filtered.slice(args.skip);
        if (args?.take !== undefined && args.take >= 0)
          filtered = filtered.slice(0, args.take);
        return filtered.map((item) => projectPrismaSelect(item, args?.select));
      },
    ),
    findFirst: vi.fn(
      async (args?: {
        where?: unknown;
        select?: unknown;
        include?: unknown;
        orderBy?: unknown;
      }): Promise<T | null> => {
        const results = await table.findMany({ ...args, take: 1 });
        return results[0] || null;
      },
    ),
    findUnique: vi.fn(
      async (args?: {
        where?: unknown;
        select?: unknown;
        include?: unknown;
      }): Promise<T | null> => {
        return table.findFirst(args);
      },
    ),
    update: vi.fn(
      async (
        args: Partial<T> | { where?: unknown; data: Partial<T> },
      ): Promise<T> => {
        const isWrapped =
          args && typeof args === "object" && "data" in args && "where" in args;
        const where = isWrapped
          ? (args as { where?: unknown }).where
          : undefined;
        const data = isWrapped
          ? (args as { data: Partial<T> }).data
          : (args as Partial<T>);
        const target = where
          ? store.find((item) => matchPrismaWhere(item as MockRecord, where))
          : store[0];
        if (target) {
          applyPrismaPatch(target as object, data);
          return { ...target };
        }
        return { ...data } as T;
      },
    ),
    updateMany: vi.fn(
      async (args?: {
        where?: unknown;
        data: Partial<T>;
      }): Promise<{ count: number }> => {
        let count = 0;
        for (const item of store) {
          if (matchPrismaWhere(item as MockRecord, args?.where)) {
            applyPrismaPatch(item as object, args?.data);
            count++;
          }
        }
        return { count };
      },
    ),
    delete: vi.fn(async (args: { where: unknown }): Promise<T> => {
      const idx = store.findIndex((item) =>
        matchPrismaWhere(item as MockRecord, args.where),
      );
      if (idx !== -1) {
        const [removed] = store.splice(idx, 1);
        return removed;
      }
      return {} as T;
    }),
    deleteMany: vi.fn(
      async (args?: { where?: unknown }): Promise<{ count: number }> => {
        let count = 0;
        for (let i = store.length - 1; i >= 0; i--) {
          if (matchPrismaWhere(store[i] as MockRecord, args?.where)) {
            store.splice(i, 1);
            count++;
          }
        }
        return { count };
      },
    ),
  };

  return table;
}

export function createMockPrismaService(
  tableMap: Record<string, unknown> = {},
): PrismaService & {
  db: { orm: { public: Record<string, MockTable<object>> } };
  client: { orm: { public: Record<string, MockTable<object>> } };
  [key: string]: unknown;
} {
  const dynamicTables: Record<string, MockTable<object>> = {};

  const getRegisteredTable = (prop: string): MockTable<object> | undefined => {
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
    return dynamicTables[lower];
  };

  const resolveRelation: RelationResolver = (modelName, item, relKey) => {
    if (modelName === "candidate") {
      if (relKey === "applications") {
        const appTbl = getRegisteredTable("application");
        return appTbl
          ? appTbl.store.filter(
              (a) => (a as MockRecord).candidateId === item.id,
            )
          : undefined;
      }
      if (relKey === "documents") {
        const docTbl = getRegisteredTable("candidateDocument");
        return docTbl
          ? docTbl.store.filter(
              (d) => (d as MockRecord).candidateId === item.id,
            )
          : undefined;
      }
      if (relKey === "candidateNotes") {
        const noteTbl = getRegisteredTable("candidateNote");
        return noteTbl
          ? noteTbl.store.filter(
              (n) => (n as MockRecord).candidateId === item.id,
            )
          : undefined;
      }
    }
    if (modelName === "application") {
      if (relKey === "job") {
        const jobTbl = getRegisteredTable("job");
        if (!jobTbl || jobTbl.store.length === 0) return undefined;
        return (
          jobTbl.store.find((j) => (j as MockRecord).id === item.jobId) ?? null
        );
      }
      if (relKey === "candidate") {
        const candTbl = getRegisteredTable("candidate");
        if (!candTbl || candTbl.store.length === 0) return undefined;
        return (
          candTbl.store.find(
            (c) => (c as MockRecord).id === item.candidateId,
          ) ?? null
        );
      }
      if (relKey === "interviews") {
        const intvTbl = getRegisteredTable("interview");
        return intvTbl
          ? intvTbl.store.filter(
              (i) => (i as MockRecord).applicationId === item.id,
            )
          : undefined;
      }
    }
    if (modelName === "job") {
      if (relKey === "applications") {
        const appTbl = getRegisteredTable("application");
        return appTbl
          ? appTbl.store.filter((a) => (a as MockRecord).jobId === item.id)
          : undefined;
      }
    }
    if (modelName === "interview") {
      if (relKey === "application") {
        const appTbl = getRegisteredTable("application");
        if (!appTbl || appTbl.store.length === 0) return undefined;
        return (
          appTbl.store.find(
            (a) => (a as MockRecord).id === item.applicationId,
          ) ?? null
        );
      }
    }
    return undefined;
  };

  const getTable = (prop: string): MockTable<object> => {
    const lower = prop.charAt(0).toLowerCase() + prop.slice(1);
    const existing = getRegisteredTable(lower);
    if (existing) {
      if (!tableRelationMeta.has(existing)) {
        tableRelationMeta.set(existing, { modelName: lower, resolveRelation });
      }
      return existing;
    }
    const created = createMockTable();
    tableRelationMeta.set(created, { modelName: lower, resolveRelation });
    dynamicTables[lower] = created;
    return created;
  };

  for (const key of Object.keys(tableMap)) {
    getTable(key);
  }

  const ormProxy = new Proxy(
    {},
    {
      get: (_, modelName: string) => getTable(modelName),
    },
  );

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

  const snapshotStores = () => {
    const snapshots = new Map<object[], object[]>();
    const capture = (tbl: unknown) => {
      if (
        tbl &&
        typeof tbl === "object" &&
        "store" in tbl &&
        Array.isArray((tbl as { store?: unknown }).store)
      ) {
        const store = (tbl as { store: object[] }).store;
        if (!snapshots.has(store)) {
          snapshots.set(
            store,
            store.map((row) =>
              row && typeof row === "object" ? { ...row } : row,
            ),
          );
        }
      }
    };
    for (const [k, v] of Object.entries(tableMap)) {
      if (Array.isArray(v)) getTable(k);
      else capture(v);
    }
    Object.values(dynamicTables).forEach(capture);
    return snapshots;
  };

  const restoreStores = (snapshots: Map<object[], object[]>) => {
    for (const [store, copy] of snapshots.entries()) {
      store.splice(0, store.length, ...copy);
    }
    for (const key of Object.keys(dynamicTables)) {
      const store = dynamicTables[key].store as object[];
      if (!snapshots.has(store)) {
        store.splice(0, store.length);
      }
    }
  };

  const txSpy = vi.fn(async (fn: unknown) => {
    const snapshots = snapshotStores();
    try {
      if (typeof fn === "function")
        return await (fn as (client: unknown) => unknown)(proxyInstance);
      if (Array.isArray(fn)) return await Promise.all(fn);
      return fn;
    } catch (err) {
      restoreStores(snapshots);
      throw err;
    }
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
