import "dotenv/config";
import postgres from "postgres";
import { config } from "../../config/env";

export const sql = postgres(config.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

function createModelHandler(tableName: string) {
  return {
    async all() {
      try {
        const rows = await sql`SELECT * FROM ${sql(tableName)}`;
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
              const rows = await sql`SELECT * FROM ${sql(tableName)}`;
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
              const rows = await sql`SELECT * FROM ${sql(tableName)}`;
              return rows as any[];
            }

            // Build dynamic WHERE clause
            const keys = entries.map(([k]) => k);
            const values = entries.map(([_, v]) => v);

            const rows = await sql`
              SELECT * FROM ${sql(tableName)}
              WHERE ${keys.reduce(
                (acc, key, i) => {
                  const fragment = sql`${sql(key)} = ${values[i]}`;
                  return i === 0 ? fragment : sql`${acc} AND ${fragment}`;
                },
                sql``,
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

            const result = await sql`
              UPDATE ${sql(tableName)}
              SET ${sql(updateObj)}
              WHERE ${condKeys.reduce(
                (acc, key, i) => {
                  const fragment = sql`${sql(key)} = ${condValues[i]}`;
                  return i === 0 ? fragment : sql`${acc} AND ${fragment}`;
                },
                sql``,
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
        const payload: Record<string, any> = {
          id,
          ...data,
        };

        const cleaned = Object.fromEntries(
          Object.entries(payload).filter(([_, v]) => v !== undefined),
        );

        const result = await sql`
          INSERT INTO ${sql(tableName)} ${sql(cleaned)}
          RETURNING *
        `;
        return result[0];
      } catch (err: any) {
        console.warn(
          `[DB Insert Warning] ${tableName}.create():`,
          err?.message || err,
        );
        return {
          id: data.id || crypto.randomUUID(),
          ...data,
        };
      }
    },
  };
}

const publicModels = new Proxy({} as Record<string, any>, {
  get(_target, prop: string) {
    return createModelHandler(prop);
  },
});

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
    return await callback(prisma);
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
