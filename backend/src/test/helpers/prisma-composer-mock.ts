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
}

export type ProxyRecord = Record<string, ProxyField>;

export type PredicateFn<T extends MockRecord> =
  ((proxy: ProxyRecord) => unknown) | ((record: T) => boolean);

export interface QueryBuilder<T extends MockRecord> {
  select(...fields: string[]): QueryBuilder<T>;
  where(predicate: PredicateFn<T>): QueryBuilder<T>;
  all(): Promise<T[]>;
  first(): Promise<T | null>;
  update(patch: Partial<T>): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  count(): Promise<number>;
  delete(): Promise<{ count: number }>;
  orderBy(field: string, direction?: "asc" | "desc"): QueryBuilder<T>;
  skip(n: number): QueryBuilder<T>;
  take(n: number): QueryBuilder<T>;
}

export interface MockTable<T extends MockRecord> {
  select(...fields: string[]): QueryBuilder<T>;
  where(predicate: PredicateFn<T>): QueryBuilder<T>;
  create(data: Partial<T>): Promise<T>;
  count(): Promise<number>;
  store: T[];
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

function projectRecord<T extends MockRecord>(record: T, fields: string[]): T {
  if (fields.length === 0) {
    return { ...record };
  }
  const result: MockRecord = {};
  for (const f of fields) {
    if (f in record) {
      result[f] = record[f];
    }
  }
  return result as T;
}

export function createQueryBuilder<T extends MockRecord>(
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
        predicates: [...state.predicates, predicate as PredicateFn<MockRecord>],
      });
    },

    async all(): Promise<T[]> {
      let filtered = store.filter((item) =>
        state.predicates.every((p) => evaluatePredicate(item, p)),
      );

      if (state.sortField) {
        const sf = state.sortField;
        const dir = state.sortDirection === "desc" ? -1 : 1;
        filtered = [...filtered].sort((a, b) => {
          const valA = a[sf];
          const valB = b[sf];
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
        state.predicates.every((p) => evaluatePredicate(item, p)),
      );

      if (state.sortField) {
        const sf = state.sortField;
        const dir = state.sortDirection === "desc" ? -1 : 1;
        filtered = [...filtered].sort((a, b) => {
          const valA = a[sf];
          const valB = b[sf];
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
        state.predicates.every((p) => evaluatePredicate(item, p)),
      );
      if (match) {
        Object.assign(match, patch);
        return projectRecord(match, state.fields);
      }
      return null;
    },

    async create(data: Partial<T>): Promise<T> {
      const record = { ...data } as T;
      store.push(record);
      return projectRecord(record, state.fields);
    },

    async count(): Promise<number> {
      const filtered = store.filter((item) =>
        state.predicates.every((p) => evaluatePredicate(item, p)),
      );
      return filtered.length;
    },

    async delete(): Promise<{ count: number }> {
      let removedCount = 0;
      for (let i = store.length - 1; i >= 0; i--) {
        const item = store[i];
        if (item && state.predicates.every((p) => evaluatePredicate(item, p))) {
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

export function createMockTable<T extends MockRecord>(
  initialItems: T[] = [],
): MockTable<T> {
  const store = [...initialItems];

  return {
    store,
    select(...fields: string[]): QueryBuilder<T> {
      return createQueryBuilder(store).select(...fields);
    },
    where(predicate: PredicateFn<T>): QueryBuilder<T> {
      return createQueryBuilder(store).where(predicate);
    },
    async create(data: Partial<T>): Promise<T> {
      const record = { ...data } as T;
      store.push(record);
      return record;
    },
    async count(): Promise<number> {
      return store.length;
    },
  };
}
