# SQL Concepts Lab

An interactive SQL trainer that runs [DuckDB-WASM](https://github.com/duckdb/duckdb-wasm) entirely in the browser. No backend: the database engine, the sample data and the exercise checker all execute client-side.

## Contents

Ten lessons in three levels, each with runnable examples and an exercise checked against a reference solution, plus a free sandbox:

- Foundations: SELECT/WHERE, ORDER BY/LIMIT/DISTINCT, NULL and three-valued logic
- Working level: joins (INNER/LEFT/ANTI), GROUP BY/HAVING, subqueries and CTEs
- Advanced: window functions and QUALIFY, set operations and ROLLUP, EXPLAIN/EXPLAIN ANALYZE, SQL dialects (T-SQL vs DuckDB vs standard)

The sample dataset is a small trading book (traders, instruments, trades) with deliberate gaps and NULL values that the join and NULL lessons depend on. The schema panel is generated live from `information_schema`.

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # type-check and build to dist/
npm run preview   # serve the production build locally
```

The DuckDB WASM binaries and workers are bundled from the npm package via Vite `?url` imports, so the deployed site has no runtime CDN dependency apart from Google Fonts.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes `dist/` to GitHub Pages. One-time setup after creating the repository: Settings → Pages → Build and deployment → Source: GitHub Actions.

`vite.config.ts` uses `base: "./"`, so the build works under `https://<user>.github.io/<repo>/` without configuration.

## Structure

```
index.html            entry point
src/main.ts           UI: navigation, editor, results, exercise checker
src/db.ts             DuckDB-WASM bootstrap and query helper
src/lessons.ts        lesson content and exercises
src/diagrams.ts       inline SVG concept diagrams
src/analytics.ts      privacy-first GoatCounter integration
src/seed.ts           sample dataset DDL/DML
src/style.css         styling
```

## Privacy

The site uses [GoatCounter](https://www.goatcounter.com) for anonymous, privacy-respecting usage counts, configured in `src/analytics.ts`:

- **No cookies, no localStorage, no fingerprinting.** GoatCounter stores no IP address — it derives a daily-rotating salted hash only to dedupe a visit, then discards it. Nothing collected can identify a person.
- **Do Not Track and Global Privacy Control are honored.** If your browser sends either signal, the analytics script is never loaded and nothing is sent.
- **Minimal data.** Only the lesson path (e.g. `/lesson/join`) and two coarse event names (`run-query`, `exercise-pass`) are counted. The SQL you type, query results, and all other input never leave your browser.
- **Off by default.** Analytics is disabled unless `GOATCOUNTER_CODE` is set in `src/analytics.ts`, so local development and any unconfigured build transmit nothing.

## License

MIT
