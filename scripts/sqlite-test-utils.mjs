import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

function normalizeSqlValue(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function createTempSqliteEnvironment(prefix = "cogni-sqlite-test-") {
  const dir = join(tmpdir(), `${prefix}${crypto.randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  const dbPath = join(dir, "test.db");
  const databaseUrl = `file:${dbPath}`;
  process.env.DATABASE_URL = databaseUrl;

  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL;");

  const migrationsDir = resolve(process.cwd(), "drizzle");
  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (migrationFiles.length === 0) {
    throw new Error("No SQL migration files found in drizzle/.");
  }

  for (const file of migrationFiles) {
    const rawSql = readFileSync(resolve(migrationsDir, file), "utf8");
    const statements = rawSql
      .split("--> statement-breakpoint")
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    for (const statement of statements) {
      sqlite.exec(statement);
    }
  }

  function raw(strings, ...values) {
    let sqlText = "";
    const params = [];
    for (let index = 0; index < strings.length; index += 1) {
      sqlText += strings[index];
      if (index < values.length) {
        sqlText += "?";
        params.push(normalizeSqlValue(values[index]));
      }
    }
    const stmt = sqlite.prepare(sqlText);
    const trimmed = sqlText.trimStart().toUpperCase();
    if (
      trimmed.startsWith("SELECT") ||
      trimmed.startsWith("WITH") ||
      trimmed.includes("RETURNING")
    ) {
      return Promise.resolve(stmt.all(...params).map((row) => ({ ...row })));
    }
    stmt.run(...params);
    return Promise.resolve([]);
  }

  raw.end = async () => {
    if (sqlite.isOpen) sqlite.close();
  };

  async function cleanup() {
    if (sqlite.isOpen) sqlite.close();
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  return { dir, dbPath, databaseUrl, raw, cleanup };
}
