import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const reset = process.argv.includes("--reset");
const rawUrl = (process.env.DATABASE_URL || "file:./.data/cogni.db").trim();

if (!rawUrl.startsWith("file:")) {
  throw new Error(
    `db:migrate only supports local SQLite file: URLs (received ${rawUrl.split(":")[0]}:).`,
  );
}

const fileSpec = rawUrl.slice("file:".length);
if (!fileSpec || fileSpec === ":memory:") {
  throw new Error("db:migrate requires a filesystem SQLite path, not :memory:.");
}

const dbPath = resolve(process.cwd(), fileSpec);
await mkdir(dirname(dbPath), { recursive: true });

if (reset) {
  for (const candidate of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`, `${dbPath}-journal`]) {
    if (existsSync(candidate)) {
      await unlink(candidate);
    }
  }
}

const migrationsDir = resolve(process.cwd(), "drizzle");
const migrationFiles = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error("No SQL migration files found in drizzle/.");
}

const db = new DatabaseSync(dbPath);
try {
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS "d1_migrations" (
      "id" INTEGER PRIMARY KEY AUTOINCREMENT,
      "name" TEXT UNIQUE,
      "applied_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT "name" FROM "d1_migrations"')
      .all()
      .map((row) => row.name),
  );

  const untrackedTables = db
    .prepare(
      `SELECT "name" FROM sqlite_master
       WHERE type = 'table' AND "name" NOT LIKE 'sqlite_%' AND "name" != 'd1_migrations'
       ORDER BY "name"`,
    )
    .all()
    .map((row) => row.name);

  if (applied.size === 0 && untrackedTables.length > 0) {
    throw new Error(
      `Untracked SQLite schema at ${dbPath} (${untrackedTables.length} existing table(s) without d1_migrations history). Re-run with --reset to recreate the local database.`,
    );
  }

  let appliedCount = 0;
  for (const file of migrationFiles) {
    if (applied.has(file)) continue;
    const rawSql = await readFile(resolve(migrationsDir, file), "utf8");
    const statements = rawSql
      .split("--> statement-breakpoint")
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    db.exec("BEGIN IMMEDIATE");
    try {
      for (const statement of statements) {
        db.exec(statement);
      }
      db.prepare('INSERT INTO "d1_migrations" ("name") VALUES (?)').run(file);
      db.exec("COMMIT");
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // Ignore rollback failure.
      }
      throw error;
    }

    appliedCount += 1;
    console.log(`Applied ${file} to ${dbPath}`);
  }

  const integrity = db.prepare("PRAGMA integrity_check").all();
  if (integrity?.[0]?.integrity_check !== "ok") {
    throw new Error(`SQLite integrity check failed: ${JSON.stringify(integrity)}`);
  }

  const foreignKeyViolations = db.prepare("PRAGMA foreign_key_check").all();
  if (foreignKeyViolations.length > 0) {
    throw new Error(`SQLite foreign key violations: ${JSON.stringify(foreignKeyViolations)}`);
  }

  console.log(
    appliedCount > 0
      ? `Local SQLite database ready at ${dbPath} (${appliedCount} migration(s) applied).`
      : `Local SQLite database already up to date at ${dbPath}.`,
  );
} finally {
  db.close();
}
