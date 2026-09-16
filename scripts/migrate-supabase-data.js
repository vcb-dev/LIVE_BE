/**
 * Copy all app data from DATABASE_URL (.env) → TARGET_DATABASE_URL (.env.migrate.target).
 * Runs prisma migrate deploy on target first, then copies public tables (except _prisma_migrations).
 *
 * Usage:
 *   node --env-file=.env.migrate.source --env-file=.env.migrate.target scripts/migrate-supabase-data.js
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const pg = require('pg');

// ponytail: Supabase pooler TLS sometimes trips Node strict chain check in this env
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BATCH = 500;
const SCHEMA = process.env.TARGET_PG_SCHEMA || 'public';

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;
const TARGET_DIRECT = process.env.TARGET_DIRECT_URL || process.env.DIRECT_URL || TARGET_URL;
const SOURCE_SCHEMA = process.env.SOURCE_PG_SCHEMA || 'public';

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Need SOURCE_DATABASE_URL + TARGET_DATABASE_URL (or both in .env).');
  process.exit(1);
}
if (SOURCE_URL === TARGET_URL && SOURCE_SCHEMA === SCHEMA) {
  console.error('Source and target are the same — abort.');
  process.exit(1);
}

function client(url) {
  return new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
}

async function listAppTables(c, schema) {
  const r = await c.query(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = $1 AND tablename <> '_prisma_migrations'
     ORDER BY tablename`,
    [schema],
  );
  return r.rows.map((x) => x.tablename);
}

async function countRows(c, schema, table) {
  const r = await c.query(`SELECT COUNT(*)::int AS n FROM "${schema}"."${table}"`);
  return r.rows[0].n;
}

async function copyTable(src, dst, srcSchema, dstSchema, table) {
  const colsRes = await src.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = $2
     ORDER BY ordinal_position`,
    [srcSchema, table],
  );
  const cols = colsRes.rows.map((r) => r.column_name);
  if (!cols.length) return 0;

  const quoted = cols.map((c) => `"${c}"`).join(', ');
  let offset = 0;
  let total = 0;

  while (true) {
    const data = await src.query(
      `SELECT ${quoted} FROM "${srcSchema}"."${table}" ORDER BY 1 LIMIT $1 OFFSET $2`,
      [BATCH, offset],
    );
    if (!data.rows.length) break;

    const placeholders = data.rows
      .map(
        (_, ri) =>
          `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(', ')})`,
      )
      .join(', ');
    const values = [];
    for (const row of data.rows) {
      for (const col of cols) values.push(row[col]);
    }

    await dst.query(
      `INSERT INTO "${dstSchema}"."${table}" (${quoted}) VALUES ${placeholders}`,
      values,
    );
    total += data.rows.length;
    offset += data.rows.length;
    if (data.rows.length < BATCH) break;
  }
  return total;
}

function runMigrateDeploy() {
  const root = path.join(__dirname, '..');
  const env = {
    ...process.env,
    DATABASE_URL: TARGET_URL,
    DIRECT_URL: TARGET_DIRECT,
  };
  const r = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: true,
  });
  if (r.status !== 0) {
    throw new Error('prisma migrate deploy failed');
  }
}

async function main() {
  const src = client(SOURCE_URL);
  const dst = client(TARGET_URL);
  await src.connect();
  await dst.connect();

  console.log(`Source (${SOURCE_SCHEMA}) tables:`);
  const tables = await listAppTables(src, SOURCE_SCHEMA);
  for (const t of tables) {
    const n = await countRows(src, SOURCE_SCHEMA, t);
    console.log(`  ${t}: ${n}`);
  }

  console.log('\nEnsuring schema exists on target...');
  await dst.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}"`);

  const mig = await dst.query(
    `SELECT COUNT(*)::int AS n FROM "${SCHEMA}"._prisma_migrations WHERE finished_at IS NOT NULL`,
  );
  const pendingFailed = await dst.query(
    `SELECT COUNT(*)::int AS n FROM "${SCHEMA}"._prisma_migrations WHERE finished_at IS NULL`,
  );
  if (pendingFailed.rows[0].n > 0) {
    console.error(
      `Target has ${pendingFailed.rows[0].n} failed migration(s) in ${SCHEMA}._prisma_migrations — fix with prisma migrate resolve first.`,
    );
    process.exit(1);
  }
  if (mig.rows[0].n === 0) {
    console.log('\nApplying migrations on target...');
    await dst.end();
    runMigrateDeploy();
    await dst.connect();
  } else {
    console.log(`\nTarget already has ${mig.rows[0].n} applied migration(s) — skipping migrate deploy.`);
  }

  const targetTables = await listAppTables(dst, SCHEMA);
  const toCopy = tables.filter((t) => targetTables.includes(t));
  const missing = tables.filter((t) => !targetTables.includes(t));
  if (missing.length) {
    console.warn('Tables on source but not on target (skipped):', missing.join(', '));
  }

  if (toCopy.length) {
    const list = toCopy.map((t) => `"${t}"`).join(', ');
    console.log(`\nTruncating target: ${list}`);
    await dst.query(`TRUNCATE TABLE ${toCopy.map((t) => `"${SCHEMA}"."${t}"`).join(', ')} CASCADE`);
  }

  let replicaOk = false;
  try {
    await dst.query('SET session_replication_role = replica');
    replicaOk = true;
    console.log('FK checks disabled for load (session_replication_role=replica).');
  } catch (e) {
    console.warn('Could not set session_replication_role:', e.message);
  }

  console.log('\nCopying data...');
  for (const table of toCopy) {
    const n = await copyTable(src, dst, SOURCE_SCHEMA, SCHEMA, table);
    console.log(`  ${table}: ${n} rows`);
  }

  if (replicaOk) {
    await dst.query('SET session_replication_role = DEFAULT');
  }

  console.log('\nDone. Update LIVE_BE/.env DATABASE_URL to target and restart the API.');
  await src.end();
  await dst.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
