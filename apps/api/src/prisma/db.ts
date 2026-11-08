import { PrismaClient } from "@prisma/client";
import type {
  ActivityLog,
  Application,
  Candidate,
  CandidateDocument,
  EmailLog,
  EmailSetting,
  EmailTemplate,
  Interview,
  InviteLink,
  Job,
  Organization,
  OrganizationAuditLog,
  OrganizationMember,
  OrganizationRolePermission,
  OrganizationWebhookSetting,
  PlatformAuditLog,
  TrackingClick,
  TrackingLink,
  User,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config();

export type DeepPartialWithTemporal<T> = {
  [P in keyof T]?: T[P] extends Date
    ? Date | string | number | null
    : T[P] | unknown;
};

export type PredicateProxy<T> = {
  [K in keyof T]-?: {
    eq(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    in(vals: (T[K] | unknown)[]): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    neq(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    is(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    isNull(): { and: (other: unknown) => unknown; value: boolean };
    isNotNull(): { and: (other: unknown) => unknown; value: boolean };
    gt(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    gte(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    lt(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
    lte(val: T[K] | unknown): {
      and: (other: unknown) => unknown;
      value: boolean;
    };
  };
};

export type PredicateFn<T> = (proxy: PredicateProxy<T>) => unknown;

export interface PrismaQueryBuilder<TModel, TResult = TModel> {
  where(predicateFn: PredicateFn<TModel>): PrismaQueryBuilder<TModel, TResult>;
  select<K extends keyof TModel>(
    ...fields: K[]
  ): PrismaQueryBuilder<TModel, Pick<TModel, K>>;
  orderBy(
    field: keyof TModel,
    direction?: "asc" | "desc",
  ): PrismaQueryBuilder<TModel, TResult>;
  skip(n: number): PrismaQueryBuilder<TModel, TResult>;
  take(n: number): PrismaQueryBuilder<TModel, TResult>;
  first(): Promise<TResult | null>;
  all(): Promise<TResult[]>;
  count(): Promise<number>;
  update(
    patch: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
  ): Promise<TResult | null>;
  updateAll(
    patch: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
  ): Promise<TResult[]>;
  delete(): Promise<{ count: number }>;
  deleteAll(): Promise<{ count: number }>;
}

export interface PrismaModelAdapter<TModel> {
  select<K extends keyof TModel>(
    ...fields: K[]
  ): PrismaQueryBuilder<TModel, Pick<TModel, K>>;
  where(predicateFn: PredicateFn<TModel>): PrismaQueryBuilder<TModel, TModel>;
  first(): Promise<TModel | null>;
  all(): Promise<TModel[]>;
  count(): Promise<number>;
  create(
    data: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
  ): Promise<TModel>;
  upsert(args: {
    create: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
    update: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
    conflictOn: Record<string, unknown> | PredicateFn<TModel>;
  }): Promise<TModel>;
  update(args: {
    set: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
    where?: Record<string, unknown> | PredicateFn<TModel>;
  }): Promise<{ count: number }>;
  delete(args?: {
    where?: Record<string, unknown> | PredicateFn<TModel>;
  }): Promise<{ count: number }>;
}

export interface PublicSchema {
  ActivityLog: PrismaModelAdapter<ActivityLog>;
  Application: PrismaModelAdapter<Application>;
  Candidate: PrismaModelAdapter<Candidate>;
  CandidateDocument: PrismaModelAdapter<CandidateDocument>;
  EmailLog: PrismaModelAdapter<EmailLog>;
  EmailSetting: PrismaModelAdapter<EmailSetting>;
  EmailTemplate: PrismaModelAdapter<EmailTemplate>;
  Interview: PrismaModelAdapter<Interview>;
  InviteLink: PrismaModelAdapter<InviteLink>;
  Job: PrismaModelAdapter<Job>;
  Organization: PrismaModelAdapter<Organization>;
  OrganizationAuditLog: PrismaModelAdapter<OrganizationAuditLog>;
  OrganizationMember: PrismaModelAdapter<OrganizationMember>;
  OrganizationRolePermission: PrismaModelAdapter<OrganizationRolePermission>;
  OrganizationWebhookSetting: PrismaModelAdapter<OrganizationWebhookSetting>;
  PlatformAuditLog: PrismaModelAdapter<PlatformAuditLog>;
  TrackingClick: PrismaModelAdapter<TrackingClick>;
  TrackingLink: PrismaModelAdapter<TrackingLink>;
  User: PrismaModelAdapter<User>;
  [key: string]: PrismaModelAdapter<Record<string, unknown>>;
}

export interface PrismaDatabaseAdapter {
  orm: {
    public: PublicSchema;
  };
  $client: PrismaClient | unknown;
  transaction<T>(fn: (tx: PrismaDatabaseAdapter) => Promise<T>): Promise<T>;
  connect(_options?: { url?: string }): Promise<void>;
  disconnect(): Promise<void>;
}

interface PrismaDelegate {
  findFirst?(
    args?: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null>;
  findMany?(args?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  count?(args?: Record<string, unknown>): Promise<number>;
  create?(args: {
    data: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  upsert?(args: {
    where: Record<string, unknown>;
    create: Record<string, unknown>;
    update: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  update?(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  updateMany?(args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;
  deleteMany?(args: {
    where: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

function sanitizePrismaValue(val: unknown): unknown {
  if (val === null || val === undefined) return val;
  if (typeof val === "object" && val !== null && "epochMilliseconds" in val) {
    return new Date(
      Number((val as { epochMilliseconds: number | bigint }).epochMilliseconds),
    );
  }
  return val;
}

function sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    result[key] = sanitizePrismaValue(val);
  }
  return result;
}

function createPredicateRecorder() {
  const conditions: Record<string, unknown> = {};
  const proxy = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      return {
        eq(val: unknown) {
          conditions[prop] = sanitizePrismaValue(val);
          return { and: (other: unknown) => other, value: true };
        },
        in(vals: unknown[]) {
          conditions[prop] = {
            in: Array.isArray(vals) ? vals.map(sanitizePrismaValue) : vals,
          };
          return { and: (other: unknown) => other, value: true };
        },
        neq(val: unknown) {
          conditions[prop] = { not: sanitizePrismaValue(val) };
          return { and: (other: unknown) => other, value: true };
        },
        is(val: unknown) {
          conditions[prop] = sanitizePrismaValue(val);
          return { and: (other: unknown) => other, value: true };
        },
        isNull() {
          conditions[prop] = null;
          return { and: (other: unknown) => other, value: true };
        },
        isNotNull() {
          conditions[prop] = { not: null };
          return { and: (other: unknown) => other, value: true };
        },
        gt(val: unknown) {
          conditions[prop] = { gt: sanitizePrismaValue(val) };
          return { and: (other: unknown) => other, value: true };
        },
        gte(val: unknown) {
          conditions[prop] = { gte: sanitizePrismaValue(val) };
          return { and: (other: unknown) => other, value: true };
        },
        lt(val: unknown) {
          conditions[prop] = { lt: sanitizePrismaValue(val) };
          return { and: (other: unknown) => other, value: true };
        },
        lte(val: unknown) {
          conditions[prop] = { lte: sanitizePrismaValue(val) };
          return { and: (other: unknown) => other, value: true };
        },
      };
    },
  });
  return { proxy, conditions };
}

function buildSelect(
  fields: string[] | null,
): Record<string, boolean> | undefined {
  if (!fields || fields.length === 0) return undefined;
  const select: Record<string, boolean> = {};
  for (const f of fields) select[f] = true;
  return select;
}

export function createPrisma7Adapter(
  prismaClient: PrismaClient | Record<string, unknown>,
): PrismaDatabaseAdapter {
  const clientRecords = prismaClient as Record<
    string,
    PrismaDelegate | undefined
  >;

  function createModelAdapter<TModel>(
    modelName: string,
  ): PrismaModelAdapter<TModel> {
    const clientKey = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    const delegate: PrismaDelegate = clientRecords[clientKey] ?? {};

    function createQueryBuilder<TResult = TModel>(
      selectedFields: string[] | null = null,
      initialConditions: Record<string, unknown> = {},
    ): PrismaQueryBuilder<TModel, TResult> {
      let conditions: Record<string, unknown> = { ...initialConditions };
      let orderByClause: Record<string, "asc" | "desc"> | undefined;
      let skipCount: number | undefined;
      let takeCount: number | undefined;

      const builder: PrismaQueryBuilder<TModel, TResult> = {
        where(predicateFn: PredicateFn<TModel>) {
          const { proxy, conditions: newCond } = createPredicateRecorder();
          predicateFn(proxy as unknown as PredicateProxy<TModel>);
          conditions = { ...conditions, ...newCond };
          return builder;
        },
        select<K extends keyof TModel>(...fields: K[]) {
          return createQueryBuilder<Pick<TModel, K>>(
            fields as string[],
            conditions,
          );
        },
        orderBy(field: keyof TModel, direction: "asc" | "desc" = "asc") {
          orderByClause = { [field as string]: direction };
          return builder;
        },
        skip(n: number) {
          skipCount = n;
          return builder;
        },
        take(n: number) {
          takeCount = n;
          return builder;
        },
        async first(): Promise<TResult | null> {
          const args: Record<string, unknown> = { where: conditions };
          const select = buildSelect(selectedFields);
          if (select) args.select = select;
          if (orderByClause) args.orderBy = orderByClause;
          const result = delegate.findFirst
            ? await delegate.findFirst(args)
            : null;
          return result as TResult | null;
        },
        async all(): Promise<TResult[]> {
          const args: Record<string, unknown> = { where: conditions };
          const select = buildSelect(selectedFields);
          if (select) args.select = select;
          if (orderByClause) args.orderBy = orderByClause;
          if (skipCount !== undefined) args.skip = skipCount;
          if (takeCount !== undefined) args.take = takeCount;
          const result = delegate.findMany ? await delegate.findMany(args) : [];
          return result as TResult[];
        },
        async count(): Promise<number> {
          return delegate.count ? delegate.count({ where: conditions }) : 0;
        },
        async update(
          patch: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
        ): Promise<TResult | null> {
          const data = sanitizeData(patch as Record<string, unknown>);
          if (delegate.updateMany) {
            await delegate.updateMany({ where: conditions, data });
          }
          const result = delegate.findFirst
            ? await delegate.findFirst({ where: conditions })
            : null;
          return result as TResult | null;
        },
        async updateAll(
          patch: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
        ): Promise<TResult[]> {
          const data = sanitizeData(patch as Record<string, unknown>);
          if (delegate.updateMany) {
            await delegate.updateMany({ where: conditions, data });
          }
          const result = delegate.findMany
            ? await delegate.findMany({ where: conditions })
            : [];
          return result as TResult[];
        },
        async delete(): Promise<{ count: number }> {
          return delegate.deleteMany
            ? delegate.deleteMany({ where: conditions })
            : { count: 0 };
        },
        async deleteAll(): Promise<{ count: number }> {
          return delegate.deleteMany
            ? delegate.deleteMany({ where: conditions })
            : { count: 0 };
        },
      };

      return builder;
    }

    const modelAdapter: PrismaModelAdapter<TModel> = {
      select<K extends keyof TModel>(...fields: K[]) {
        return createQueryBuilder<Pick<TModel, K>>(fields as string[]);
      },
      where(predicateFn: PredicateFn<TModel>) {
        const { proxy, conditions } = createPredicateRecorder();
        predicateFn(proxy as unknown as PredicateProxy<TModel>);
        return createQueryBuilder<TModel>(null, conditions);
      },
      async first(): Promise<TModel | null> {
        const result = delegate.findFirst ? await delegate.findFirst() : null;
        return result as TModel | null;
      },
      async all(): Promise<TModel[]> {
        const result = delegate.findMany ? await delegate.findMany() : [];
        return result as TModel[];
      },
      async count(): Promise<number> {
        return delegate.count ? delegate.count() : 0;
      },
      async create(
        data: DeepPartialWithTemporal<TModel> | Record<string, unknown>,
      ): Promise<TModel> {
        const result = delegate.create
          ? await delegate.create({
              data: sanitizeData(data as Record<string, unknown>),
            })
          : { ...data };
        return result as TModel;
      },
      async upsert({
        create,
        update,
        conflictOn,
      }: {
        create: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
        update: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
        conflictOn: Record<string, unknown> | PredicateFn<TModel>;
      }): Promise<TModel> {
        let where: Record<string, unknown>;
        if (typeof conflictOn === "function") {
          const { proxy, conditions } = createPredicateRecorder();
          conflictOn(proxy as unknown as PredicateProxy<TModel>);
          where = conditions;
        } else {
          where = conflictOn;
        }
        const result = delegate.upsert
          ? await delegate.upsert({
              where,
              create: sanitizeData(create as Record<string, unknown>),
              update: sanitizeData(update as Record<string, unknown>),
            })
          : { ...create, ...update };
        return result as TModel;
      },
      async update({
        set,
        where: whereFn,
      }: {
        set: DeepPartialWithTemporal<TModel> | Record<string, unknown>;
        where?: Record<string, unknown> | PredicateFn<TModel>;
      }): Promise<{ count: number }> {
        let where: Record<string, unknown> = {};
        if (typeof whereFn === "function") {
          const { proxy, conditions } = createPredicateRecorder();
          whereFn(proxy as unknown as PredicateProxy<TModel>);
          where = conditions;
        } else if (whereFn) {
          where = whereFn;
        }
        return delegate.updateMany
          ? delegate.updateMany({
              where,
              data: sanitizeData(set as Record<string, unknown>),
            })
          : { count: 0 };
      },
      async delete({
        where: whereFn,
      }: {
        where?: Record<string, unknown> | PredicateFn<TModel>;
      } = {}): Promise<{ count: number }> {
        let where: Record<string, unknown> = {};
        if (typeof whereFn === "function") {
          const { proxy, conditions } = createPredicateRecorder();
          whereFn(proxy as unknown as PredicateProxy<TModel>);
          where = conditions;
        } else if (whereFn) {
          where = whereFn;
        }
        return delegate.deleteMany
          ? delegate.deleteMany({ where })
          : { count: 0 };
      },
    };

    return modelAdapter;
  }

  const orm = {
    public: new Proxy({} as PublicSchema, {
      get(_target, modelName: string) {
        return createModelAdapter(modelName);
      },
    }),
  };

  const adapter: PrismaDatabaseAdapter = {
    orm,
    $client: prismaClient,
    async transaction<T>(
      fn: (tx: PrismaDatabaseAdapter) => Promise<T>,
    ): Promise<T> {
      const clientWithTx = prismaClient as {
        $transaction?: (cb: (txClient: unknown) => Promise<T>) => Promise<T>;
      };
      if (typeof clientWithTx.$transaction === "function") {
        return clientWithTx.$transaction(async (txClient: unknown) => {
          const txAdapter = createPrisma7Adapter(
            txClient as PrismaClient | Record<string, unknown>,
          );
          return fn(txAdapter);
        });
      }
      return fn(adapter);
    },
    async connect(_options?: { url?: string }): Promise<void> {
      const clientWithConn = prismaClient as {
        $connect?: () => Promise<void>;
      };
      if (typeof clientWithConn.$connect === "function") {
        await clientWithConn.$connect();
      }
    },
    async disconnect(): Promise<void> {
      const clientWithConn = prismaClient as {
        $disconnect?: () => Promise<void>;
      };
      if (typeof clientWithConn.$disconnect === "function") {
        await clientWithConn.$disconnect();
      }
    },
  };

  return adapter;
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://haihire:haihire_secret@localhost:5432/haihire_dev";

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
export const db = createPrisma7Adapter(prisma);

let connection: Promise<void> | undefined;

export function connectDatabase(_options?: { url?: string }): Promise<void> {
  connection ??= db
    .connect(_options)
    .then(() => undefined)
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
