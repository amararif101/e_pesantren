import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function runSafeMigrations() {
  console.log("Running safe migrations setup...");

  // 1. Ensure __drizzle_migrations table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS \`__drizzle_migrations\` (
      \`id\` bigint unsigned AUTO_INCREMENT PRIMARY KEY,
      \`hash\` text NOT NULL,
      \`created_at\` bigint
    );
  `);

  const journalPath = path.join(process.cwd(), "drizzle", "meta", "_journal.json");
  if (!fs.existsSync(journalPath)) {
    console.error("Migration journal not found!");
    process.exit(1);
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));
  const entries = journal.entries || [];

  // Fetch already recorded migration hashes
  const existingRows = (await db.execute(sql`SELECT id, hash, created_at FROM \`__drizzle_migrations\``)) as any;
  const existingHashes = new Set((existingRows[0] || []).map((r: any) => r.hash));

  console.log(`Found ${existingHashes.size} existing recorded migration(s).`);

  for (const entry of entries) {
    const tag = entry.tag;
    const when = entry.when;
    const sqlFile = path.join(process.cwd(), "drizzle", `${tag}.sql`);

    if (!fs.existsSync(sqlFile)) {
      console.warn(`File ${sqlFile} not found, skipping.`);
      continue;
    }

    const content = fs.readFileSync(sqlFile, "utf-8");
    const hash = createHash("sha256").update(content).digest("hex");

    if (existingHashes.has(hash)) {
      console.log(`Migration ${tag} already recorded, skipping execution.`);
      continue;
    }

    if (entry.idx <= 16) {
      // Past migration (0000 - 0016): tables already exist in live DB.
      // Mark as recorded in __drizzle_migrations so Drizzle doesn't re-run CREATE TABLE.
      console.log(`Marking past migration ${tag} as recorded...`);
      await db.execute(sql`
        INSERT INTO \`__drizzle_migrations\` (\`hash\`, \`created_at\`) VALUES (${hash}, ${when});
      `);
      existingHashes.add(hash);
    } else {
      // New migration (0017+): execute SQL statements safely
      console.log(`Applying new migration ${tag}...`);
      const statements = content
        .split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          // Replace raw sql execution
          await db.execute(sql.raw(stmt));
          console.log(`  Executed statement in ${tag}`);
        } catch (err: any) {
          if (
            err.message?.includes("Duplicate column name") ||
            err.message?.includes("already exists")
          ) {
            console.warn(`  Notice: statement in ${tag} already applied (${err.message}). Continuing.`);
          } else {
            console.error(`  Error in ${tag}:`, err.message);
            throw err;
          }
        }
      }

      await db.execute(sql`
        INSERT INTO \`__drizzle_migrations\` (\`hash\`, \`created_at\`) VALUES (${hash}, ${when});
      `);
      existingHashes.add(hash);
      console.log(`Migration ${tag} applied and recorded successfully!`);
    }
  }

  console.log("All migrations synced safely without data loss!");
  process.exit(0);
}

runSafeMigrations().catch((err) => {
  console.error("Safe migration failed:", err);
  process.exit(1);
});
