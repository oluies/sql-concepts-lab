import * as duckdb from "@duckdb/duckdb-wasm";
import duckdb_wasm_mvp from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import { SEED } from "./seed";

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: duckdb_wasm_mvp, mainWorker: mvp_worker },
  eh: { mainModule: duckdb_wasm_eh, mainWorker: eh_worker },
};

let conn: duckdb.AsyncDuckDBConnection;

export interface QueryResult {
  cols: string[];
  rows: (string | null)[][];
}

export async function boot(): Promise<string> {
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
  const worker = new Worker(bundle.mainWorker!);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  conn = await db.connect();
  await seed();
  const v = await exec("PRAGMA version");
  return String(v.rows[0][0]);
}

export async function seed(): Promise<void> {
  for (const stmt of SEED) await conn.query(stmt);
}

function fmt(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date)
    return v.toISOString().replace("T", " ").replace(/\.000Z$/, "");
  if (typeof v === "number" && !Number.isInteger(v))
    return String(+v.toFixed(6));
  return String(v);
}

export async function exec(sql: string): Promise<QueryResult> {
  const res = await conn.query(sql);
  const cols = res.schema.fields.map((f) => f.name);
  const rows = res
    .toArray()
    .map((r) => {
      const j = r.toJSON() as Record<string, unknown>;
      return cols.map((c) => fmt(j[c]));
    });
  return { cols, rows };
}
