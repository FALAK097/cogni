import type { AsyncLocalStorage } from "node:async_hooks";
import type { DatabaseSync, SQLInputValue, StatementSync } from "node:sqlite";
import type { AnyD1Database } from "drizzle-orm/d1";

const LOCAL_D1_STORE_SYMBOL = Symbol.for("cogni.localD1Store");

type LocalSqliteStore = {
  fileKey: string;
  db: DatabaseSync;
  tail: Promise<void>;
};

export type LocalD1Database = AnyD1Database & {
  [LOCAL_D1_STORE_SYMBOL]: LocalSqliteStore;
  close: () => void;
};

const D1_MAX_BOUND_PARAMETERS = 100;

type TransactionContext = {
  fileKey: string;
  depth: number;
  active: boolean;
};

const stores = new Map<string, LocalSqliteStore>();
let txContextStorage: AsyncLocalStorage<TransactionContext> | undefined;

function getBuiltinModule<T>(id: string): T {
  const builtin = process.getBuiltinModule?.(id) as T | undefined;
  if (!builtin) {
    throw new Error(`Node builtin module "${id}" is unavailable in this runtime.`);
  }
  return builtin;
}

function getTxStorage(): AsyncLocalStorage<TransactionContext> {
  if (!txContextStorage) {
    const { AsyncLocalStorage: Als } =
      getBuiltinModule<typeof import("node:async_hooks")>("node:async_hooks");
    txContextStorage = new Als<TransactionContext>();
  }
  return txContextStorage;
}

function normalizeParam(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "string" ||
    value instanceof Uint8Array
  ) {
    return value;
  }
  throw new TypeError(
    `Unsupported D1 bind parameter type: ${value instanceof Date ? "Date" : typeof value}.`,
  );
}

function resolveSqliteLocation(databaseUrl?: string): { fileKey: string; sqlitePath: string } {
  const raw = (databaseUrl ?? process.env.DATABASE_URL ?? "file:./.data/cogni.db").trim();
  if (raw === ":memory:" || raw === "file::memory:") {
    return { fileKey: `:memory:${crypto.randomUUID()}`, sqlitePath: ":memory:" };
  }
  if (!raw.startsWith("file:")) {
    throw new Error(
      `Local SQLite database requires a file: URL or :memory: (received "${raw.split(":")[0]}:").`,
    );
  }
  const fileSpec = raw.slice("file:".length);
  if (!fileSpec) {
    throw new Error("Local SQLite DATABASE_URL file: path cannot be empty.");
  }

  const path = getBuiltinModule<typeof import("node:path")>("node:path");
  const fs = getBuiltinModule<typeof import("node:fs")>("node:fs");
  const resolvedPath = path.resolve(process.cwd(), fileSpec);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  return { fileKey: `file:${resolvedPath}`, sqlitePath: resolvedPath };
}

function openSqliteStore(databaseUrl?: string): LocalSqliteStore {
  const { fileKey, sqlitePath } = resolveSqliteLocation(databaseUrl);
  const existing = sqlitePath !== ":memory:" ? stores.get(fileKey) : undefined;
  if (existing) return existing;

  const { DatabaseSync: SqliteDatabaseSync } =
    getBuiltinModule<typeof import("node:sqlite")>("node:sqlite");
  const db = new SqliteDatabaseSync(sqlitePath);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (sqlitePath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }

  const store: LocalSqliteStore = {
    fileKey,
    db,
    tail: Promise.resolve(),
  };
  if (sqlitePath !== ":memory:") {
    stores.set(fileKey, store);
  }
  return store;
}

async function withStoreMutex<T>(store: LocalSqliteStore, fn: () => T | Promise<T>): Promise<T> {
  const storage = getTxStorage();
  const active = storage.getStore();
  if (active && active.active && active.fileKey === store.fileKey) {
    return await fn();
  }

  const previous = store.tail;
  let release!: () => void;
  store.tail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

function createMeta(changes = 0, lastRowId = 0) {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: changes,
    last_row_id: lastRowId,
    changed_db: changes > 0,
    changes,
  };
}

function toPlainRow(row: Record<string, unknown>): Record<string, unknown> {
  return { ...row };
}

function readRawRows(stmt: StatementSync, params: SQLInputValue[]): unknown[][] {
  stmt.setReturnArrays(true);
  try {
    return stmt.all(...params) as unknown as unknown[][];
  } finally {
    stmt.setReturnArrays(false);
  }
}

export function getLocalD1Database(databaseUrl?: string): LocalD1Database {
  const store = openSqliteStore(databaseUrl);

  const makePrepared = (query: string, params: SQLInputValue[] = []) => {
    if (params.length > D1_MAX_BOUND_PARAMETERS) {
      throw new Error(
        `D1 prepared statement exceeded ${D1_MAX_BOUND_PARAMETERS} bound parameters (received ${params.length}).`,
      );
    }

    const runPrepared = () =>
      withStoreMutex(store, () => {
        const stmt = store.db.prepare(query);
        const result = stmt.run(...params);
        return {
          success: true as const,
          results: [] as Record<string, unknown>[],
          meta: createMeta(Number(result.changes ?? 0), Number(result.lastInsertRowid ?? 0)),
        };
      });

    const allPrepared = () =>
      withStoreMutex(store, () => {
        const stmt = store.db.prepare(query);
        const rows = (stmt.all(...params) as Record<string, unknown>[]).map(toPlainRow);
        return {
          success: true as const,
          results: rows,
          meta: { ...createMeta(0, 0), rows_read: rows.length },
        };
      });

    const rawPrepared = (options?: { columnNames?: boolean }) =>
      withStoreMutex(store, () => {
        const stmt = store.db.prepare(query);
        const rows = readRawRows(stmt, params);
        if (options?.columnNames) {
          const cols = stmt.columns().map((col) => col.name);
          return [cols, ...rows];
        }
        return rows;
      });

    const firstPrepared = (column?: string) =>
      withStoreMutex(store, () => {
        const stmt = store.db.prepare(query);
        const row = stmt.get(...params) as Record<string, unknown> | undefined;
        if (!row) return null;
        if (column !== undefined) return row[column] ?? null;
        return toPlainRow(row);
      });

    return {
      query,
      params,
      bind(...values: unknown[]) {
        return makePrepared(query, values.map(normalizeParam));
      },
      run: runPrepared,
      all: allPrepared,
      raw: rawPrepared,
      first: firstPrepared,
    };
  };

  const localD1 = {
    [LOCAL_D1_STORE_SYMBOL]: store,
    prepare(query: string) {
      return makePrepared(query, []);
    },
    async batch(statements: Array<{ query: string; params: SQLInputValue[] }>) {
      return withStoreMutex(store, () => {
        const storage = getTxStorage();
        const active = storage.getStore();
        const nested = Boolean(active?.active && active.fileKey === store.fileKey);
        const savepoint = nested ? `sp_batch_${active!.depth}` : null;
        if (savepoint) {
          store.db.exec(`SAVEPOINT ${savepoint}`);
        } else {
          store.db.exec("BEGIN IMMEDIATE");
        }
        try {
          const results = statements.map((statement) => {
            if (statement.params.length > D1_MAX_BOUND_PARAMETERS) {
              throw new Error(
                `D1 prepared statement exceeded ${D1_MAX_BOUND_PARAMETERS} bound parameters (received ${statement.params.length}).`,
              );
            }
            const stmt = store.db.prepare(statement.query);
            if (stmt.columns().length > 0) {
              const rows = (stmt.all(...statement.params) as Record<string, unknown>[]).map(
                toPlainRow,
              );
              return {
                success: true as const,
                results: rows,
                meta: { ...createMeta(0, 0), rows_read: rows.length },
              };
            }
            const runResult = stmt.run(...statement.params);
            return {
              success: true as const,
              results: [] as Record<string, unknown>[],
              meta: createMeta(
                Number(runResult.changes ?? 0),
                Number(runResult.lastInsertRowid ?? 0),
              ),
            };
          });
          if (savepoint) {
            store.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
          } else {
            store.db.exec("COMMIT");
          }
          return results;
        } catch (error) {
          try {
            if (savepoint) {
              store.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
              store.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
            } else {
              store.db.exec("ROLLBACK");
            }
          } catch {
            // Ignore rollback errors after failure.
          }
          throw error;
        }
      });
    },
    async exec(sqlText: string) {
      return withStoreMutex(store, () => {
        store.db.exec(sqlText);
        return { count: 0, duration: 0 };
      });
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    withSession() {
      return localD1;
    },
    close() {
      if (store.db.isOpen) {
        store.db.close();
      }
      stores.delete(store.fileKey);
    },
  };

  return localD1 as unknown as LocalD1Database;
}

export function getLocalStoreFromClient(client: unknown): LocalSqliteStore | null {
  if (!client || typeof client !== "object") return null;
  if (LOCAL_D1_STORE_SYMBOL in client) {
    return (client as LocalD1Database)[LOCAL_D1_STORE_SYMBOL];
  }
  return null;
}

export async function runLocalWriteTransaction<T>(
  store: LocalSqliteStore,
  operation: () => Promise<T>,
): Promise<T> {
  const storage = getTxStorage();
  const active = storage.getStore();
  if (active && active.active && active.fileKey === store.fileKey) {
    const savepoint = `sp_${active.depth}`;
    store.db.exec(`SAVEPOINT ${savepoint}`);
    const nestedContext: TransactionContext = {
      fileKey: store.fileKey,
      depth: active.depth + 1,
      active: true,
    };
    try {
      const result = await storage.run(nestedContext, operation);
      store.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      return result;
    } catch (error) {
      try {
        store.db.exec(`ROLLBACK TO SAVEPOINT ${savepoint}`);
        store.db.exec(`RELEASE SAVEPOINT ${savepoint}`);
      } catch {
        // Ignore savepoint rollback failure.
      }
      throw error;
    } finally {
      nestedContext.active = false;
    }
  }

  return withStoreMutex(store, async () => {
    store.db.exec("BEGIN IMMEDIATE");
    const rootContext: TransactionContext = { fileKey: store.fileKey, depth: 1, active: true };
    try {
      const result = await storage.run(rootContext, operation);
      store.db.exec("COMMIT");
      return result;
    } catch (error) {
      try {
        store.db.exec("ROLLBACK");
      } catch {
        // Ignore rollback failure.
      }
      throw error;
    } finally {
      rootContext.active = false;
    }
  });
}
