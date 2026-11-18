import "dotenv/config";
import postgres from "postgres";
import { config } from "../../config/env";

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

const tableColumnsCache = new Map<string, Set<string>>();

async function getTableColumns(tableName: string, db: typeof sql = sql): Promise<Set<string>> {
  const cached = tableColumnsCache.get(tableName);
  if (cached) return cached;

  const rows = await db<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  const columns = new Set(rows.map((row) => row.column_name));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function createModelHandler(tableName: string, db: typeof sql = sql) {
  return {
    async all() {
      try {
        const rows = await db`SELECT * FROM ${db(tableName)}`;
        return rows as any[];
      } catch (err: any) {
        console.warn(
          `[DB Query Warning] ${tableName}.all():`,
          err?.message || err,
        );
        return [];
      }
    },

    where(conditions: Record<string, any> | ((candidate: any) => any)) {
      return {
        async all() {
          try {
            if (typeof conditions === "function") {
              const rows = await db`SELECT * FROM ${db(tableName)}`;
              return rows.filter((r) => {
                try {
                  return (conditions as any)(r);
                } catch {
                  return true;
                }
              }) as any[];
            }

            const entries = Object.entries(conditions).filter(
              ([_, v]) => v !== undefined,
            );
            if (entries.length === 0) {
              const rows = await db`SELECT * FROM ${db(tableName)}`;
              return rows as any[];
            }

            // Build dynamic WHERE clause
            const keys = entries.map(([k]) => k);
            const values = entries.map(([_, v]) => v);

            const rows = await db`
              SELECT * FROM ${db(tableName)}
              WHERE ${keys.reduce(
                (acc, key, i) => {
                  const fragment = db`${db(key)} = ${values[i]}`;
                  return i === 0 ? fragment : db`${acc} AND ${fragment}`;
                },
                db``,
              )}
            `;
            return rows as any[];
          } catch (err: any) {
            console.warn(
              `[DB Query Warning] ${tableName}.where().all():`,
              err?.message || err,
            );
            return [];
          }
        },

        async first() {
          const rows = await this.all();
          return rows.length > 0 ? rows[0] : null;
        },

        async update(data: Record<string, any>) {
          try {
            const dataEntries = Object.entries(data).filter(
              ([_, v]) => v !== undefined,
            );
            if (dataEntries.length === 0) return null;

            const updateObj = Object.fromEntries(dataEntries);

            if (typeof conditions === "function") {
              throw new Error(
                "Update with function predicate is not supported",
              );
            }

            const condEntries = Object.entries(conditions).filter(
              ([_, v]) => v !== undefined,
            );
            const condKeys = condEntries.map(([k]) => k);
            const condValues = condEntries.map(([_, v]) => v);

            const result = await db`
              UPDATE ${db(tableName)}
              SET ${db(updateObj)}
              WHERE ${condKeys.reduce(
                (acc, key, i) => {
                  const fragment = db`${db(key)} = ${condValues[i]}`;
                  return i === 0 ? fragment : db`${acc} AND ${fragment}`;
                },
                db``,
              )}
              RETURNING *
            `;
            return result.length > 0 ? result[0] : null;
          } catch (err: any) {
            console.warn(
              `[DB Update Warning] ${tableName}.update():`,
              err?.message || err,
            );
            return { ...data };
          }
        },
      };
    },

    async create(data: Record<string, any>) {
      try {
        const id = data.id || crypto.randomUUID();
        const columns = await getTableColumns(tableName, db);
        const now = new Date();
        const normalizedData = Object.fromEntries(
          Object.entries(data).map(([key, value]) => {
            const camelKey = columns.has(key) ? key : toCamelCase(key);
            return [camelKey, value];
          }),
        );
        const payload: Record<string, any> = {
          id,
          ...(columns.has("createdAt") ? { createdAt: now } : {}),
          ...(columns.has("updatedAt") ? { updatedAt: now } : {}),
          ...normalizedData,
        };

        const cleaned = Object.fromEntries(
          Object.entries(payload).filter(
            ([key, value]) =>
              columns.has(key) && value !== undefined,
          ),
        );

        const result = await db`
          INSERT INTO ${db(tableName)} ${db(cleaned)}
          RETURNING *
        `;
        return result[0];
      } catch (err: any) {
        console.warn(
          `[DB Insert Warning] ${tableName}.create():`,
          err?.message || err,
        );
        throw err;
      }
    },

    async update(input: { where: Record<string, any>; data: Record<string, any> }) {
      return await this.where(input.where).update(input.data);
    },
  };
}

const publicModels = new Proxy({} as Record<string, any>, {
  get(_target, prop: string) {
    return createModelHandler(prop, sql);
  },
});

function createClient(db: typeof sql): DatabaseClient {
  const models = new Proxy({} as Record<string, any>, {
    get(_target, prop: string) {
      return createModelHandler(prop, db);
    },
  });
  return {
    sql: db,
    orm: { public: models },
    async transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T> {
      return await db.begin(async (transaction) => callback(createClient(transaction as unknown as typeof sql)));
    },
    async connect(): Promise<void> { await db`SELECT 1`; },
    async close(): Promise<void> { await db.end({ timeout: 5 }); },
  };
}

export interface DatabaseClient {
  sql: typeof sql;
  orm: {
    public: Record<string, any>;
  };
  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T>;
  connect(): Promise<void>;
  close(): Promise<void>;
}

export const prisma: DatabaseClient = {
  sql,
  orm: {
    public: publicModels,
  },
  async transaction<T>(
    callback: (tx: DatabaseClient) => Promise<T>,
  ): Promise<T> {
    return await sql.begin(async (transaction) => callback(createClient(transaction as unknown as typeof sql)));
  },
  async connect(): Promise<void> {
    await sql`SELECT 1`;
  },
  async close(): Promise<void> {
    await sql.end({ timeout: 5 });
  },
};

export async function checkDatabaseConnection(): Promise<void> {
  await sql`SELECT 1`;
}

export async function closeDatabase(): Promise<void> {
  try {
    await sql.end({ timeout: 5 });
  } catch (err) {
    console.error("Error closing database:", err);
  }
}
