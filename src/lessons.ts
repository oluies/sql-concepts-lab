import { DIAGRAMS } from "./diagrams";

export interface Exercise {
  task: string;
  solution: string;
  ordered?: boolean;
}

export interface Lesson {
  id: string;
  grp: string;
  lvl: string;
  title: string;
  prose: string;
  /** Inline SVG concept diagram rendered between prose and examples. */
  diagram?: string;
  examples: [label: string, sql: string][];
  ex: Exercise | null;
  sandbox?: boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: "select",
    grp: "Foundations",
    lvl: "Beginner",
    title: "SELECT, WHERE and projection",
    prose: `<p>A query reads rows from a table, keeps the rows that satisfy a condition (<code>WHERE</code>), and returns the listed columns. The column list is called the projection. <code>*</code> means every column.</p>
<p>String comparison is case sensitive here, and string literals use single quotes. Double quotes are reserved for identifiers such as column names.</p>
<p class="note">DuckDB also accepts <code>FROM trades</code> on its own, and even before <code>SELECT</code>. Try the last example.</p>`,
    examples: [
      ["all trades", "SELECT * FROM trades"],
      ["three columns", "SELECT trade_id, side, price\nFROM trades"],
      [
        "filter",
        "SELECT trade_id, quantity, price\nFROM trades\nWHERE side = 'BUY' AND quantity > 10000",
      ],
      [
        "FROM-first",
        "FROM instruments\nSELECT name, currency\nWHERE currency = 'SEK'",
      ],
    ],
    ex: {
      task: "Return name and desk for every trader on the Equities desk.",
      solution: "SELECT name, desk FROM traders WHERE desk = 'Equities'",
    },
  },
  {
    id: "order",
    grp: "Foundations",
    lvl: "Beginner",
    title: "ORDER BY, LIMIT, DISTINCT",
    prose: `<p>Tables have no inherent order. Without <code>ORDER BY</code>, row order is an implementation detail and can change between runs. <code>LIMIT</code> truncates the result after ordering, which is how a top-N query is written. <code>DISTINCT</code> removes duplicate rows from the projection.</p>
<p><code>ORDER BY 2 DESC</code> sorts by the second column in the projection. Named columns are clearer in anything you keep.</p>`,
    examples: [
      [
        "largest trades",
        "SELECT trade_id, isin, quantity\nFROM trades\nORDER BY quantity DESC\nLIMIT 5",
      ],
      ["distinct desks", "SELECT DISTINCT desk FROM traders"],
      [
        "two sort keys",
        "SELECT isin, side, traded_at\nFROM trades\nORDER BY isin, traded_at DESC",
      ],
    ],
    ex: {
      task: "List the 3 most recent trades (trade_id and traded_at), newest first.",
      solution:
        "SELECT trade_id, traded_at FROM trades ORDER BY traded_at DESC LIMIT 3",
      ordered: true,
    },
  },
  {
    id: "null",
    grp: "Foundations",
    lvl: "Beginner",
    title: "NULL and three-valued logic",
    prose: `<p>NULL means the value is unknown or absent, not zero and not an empty string. Any comparison with NULL yields neither true nor false but <code>NULL</code>, so <code>price = NULL</code> matches nothing. Use <code>IS NULL</code> and <code>IS NOT NULL</code>.</p>
<p>This third truth value propagates: a <code>WHERE</code> clause keeps a row only when the condition is true, so rows where it evaluates to NULL are dropped. Aggregates ignore NULL inputs, which is why <code>COUNT(price)</code> and <code>COUNT(*)</code> can differ. <code>COALESCE(a, b)</code> returns the first non-NULL argument.</p>
<p>In our data, two trades have a NULL price: they are awaiting confirmation.</p>`,
    examples: [
      [
        "the wrong way",
        "SELECT * FROM trades WHERE price = NULL  -- returns nothing",
      ],
      [
        "the right way",
        "SELECT trade_id, isin, price\nFROM trades\nWHERE price IS NULL",
      ],
      [
        "count difference",
        "SELECT count(*) AS all_rows,\n       count(price) AS priced_rows\nFROM trades",
      ],
      [
        "coalesce",
        "SELECT trade_id, coalesce(price, 0) AS price_or_zero\nFROM trades\nORDER BY trade_id",
      ],
    ],
    ex: {
      task: "Return trade_id and quantity for trades that do have a price (price is not NULL) and quantity above 1,000,000.",
      solution:
        "SELECT trade_id, quantity FROM trades WHERE price IS NOT NULL AND quantity > 1000000",
    },
  },
  {
    id: "join",
    grp: "Working level",
    lvl: "Intermediate",
    title: "Joins: INNER, LEFT, ANTI",
    prose: `<p>A join combines rows from two tables where a condition holds, usually equality on a key. <code>INNER JOIN</code> keeps only matching pairs. <code>LEFT JOIN</code> keeps every row from the left table and fills the right side with NULL when there is no match.</p>
<p>The seed data contains two deliberate gaps: trader David Ek has no trades, and instrument EIB FRN 2031 has never traded. An inner join hides them; a left join exposes them as NULL rows; filtering a left join on <code>right_key IS NULL</code> gives an anti-join ("rows in A with no match in B"). DuckDB also has a literal <code>ANTI JOIN</code> for this.</p>`,
    diagram: DIAGRAMS.join,
    examples: [
      [
        "inner join",
        "SELECT t.trade_id, tr.name, i.name AS instrument, t.quantity\nFROM trades t\nJOIN traders tr ON tr.trader_id = t.trader_id\nJOIN instruments i ON i.isin = t.isin\nORDER BY t.trade_id",
      ],
      [
        "left join, see the gap",
        "SELECT tr.name, count(t.trade_id) AS trades\nFROM traders tr\nLEFT JOIN trades t ON t.trader_id = tr.trader_id\nGROUP BY tr.name\nORDER BY trades DESC",
      ],
      [
        "anti-join (never traded)",
        "SELECT i.isin, i.name\nFROM instruments i\nANTI JOIN trades t ON t.isin = i.isin",
      ],
    ],
    ex: {
      task: "Using a LEFT JOIN from traders to trades, return the name of every trader who has made no trades at all.",
      solution:
        "SELECT tr.name FROM traders tr LEFT JOIN trades t ON t.trader_id = tr.trader_id WHERE t.trade_id IS NULL",
    },
  },
  {
    id: "group",
    grp: "Working level",
    lvl: "Intermediate",
    title: "GROUP BY and HAVING",
    prose: `<p><code>GROUP BY</code> collapses rows that share the same key values into one row per group; aggregate functions (<code>count</code>, <code>sum</code>, <code>avg</code>, <code>min</code>, <code>max</code>) summarize each group. Every projected column must be either a grouping key or an aggregate.</p>
<p><code>WHERE</code> filters rows before grouping; <code>HAVING</code> filters the groups afterwards, so it can reference aggregates. DuckDB's <code>GROUP BY ALL</code> groups by every non-aggregate column in the projection, which removes a common source of copy errors.</p>`,
    diagram: DIAGRAMS.group,
    examples: [
      [
        "per instrument",
        "SELECT isin, count(*) AS n, sum(quantity) AS total_qty\nFROM trades\nGROUP BY isin\nORDER BY total_qty DESC",
      ],
      [
        "having",
        "SELECT trader_id, count(*) AS n\nFROM trades\nGROUP BY trader_id\nHAVING count(*) >= 5",
      ],
      [
        "group by all",
        "SELECT side, isin, count(*) AS n\nFROM trades\nGROUP BY ALL\nORDER BY isin, side",
      ],
    ],
    ex: {
      task: "Per side (BUY/SELL), return the side and the average priced notional, avg(quantity * price), aliased as avg_notional. Pending trades (NULL price) are ignored by avg automatically.",
      solution:
        "SELECT side, avg(quantity * price) AS avg_notional FROM trades GROUP BY side",
    },
  },
  {
    id: "cte",
    grp: "Working level",
    lvl: "Intermediate",
    title: "Subqueries and CTEs",
    prose: `<p>A subquery is a query used as a value or as a table inside another query. A common table expression (<code>WITH name AS (...)</code>) names an intermediate result so the main query reads top-down instead of inside-out. CTEs are the standard way to structure multi-step transformations, and the form dbt models are built around.</p>
<p>A correlated subquery references columns of the outer query and is conceptually evaluated per row. Many correlated subqueries can be rewritten as joins or window functions; the optimizer often does this for you (DuckDB calls it unnesting).</p>`,
    examples: [
      [
        "scalar subquery",
        "SELECT trade_id, quantity\nFROM trades\nWHERE quantity > (SELECT avg(quantity) FROM trades)",
      ],
      [
        "cte pipeline",
        "WITH per_trader AS (\n  SELECT trader_id, sum(quantity * price) AS notional\n  FROM trades\n  WHERE price IS NOT NULL\n  GROUP BY trader_id\n)\nSELECT tr.name, p.notional\nFROM per_trader p\nJOIN traders tr USING (trader_id)\nORDER BY p.notional DESC",
      ],
      [
        "IN subquery",
        "SELECT name FROM instruments\nWHERE isin IN (SELECT isin FROM trades WHERE side = 'SELL')",
      ],
    ],
    ex: {
      task: "With a CTE named sek_isins selecting isin from instruments where currency = 'SEK', return the count(*) of trades whose isin is in that CTE. Alias the count as n.",
      solution:
        "WITH sek_isins AS (SELECT isin FROM instruments WHERE currency = 'SEK') SELECT count(*) AS n FROM trades WHERE isin IN (SELECT isin FROM sek_isins)",
    },
  },
  {
    id: "window",
    grp: "Advanced",
    lvl: "Advanced",
    title: "Window functions",
    prose: `<p>A window function computes a value per row over a related set of rows (the window) without collapsing them, unlike <code>GROUP BY</code>. <code>OVER (PARTITION BY ... ORDER BY ...)</code> defines the window: partitioning splits rows into groups, ordering defines position within each group.</p>
<p><code>row_number()</code>, <code>rank()</code> and <code>dense_rank()</code> number rows; <code>lag()</code> and <code>lead()</code> read neighboring rows; aggregates with an <code>ORDER BY</code> in the window become running totals. DuckDB's <code>QUALIFY</code> clause filters on window results directly, where standard SQL needs a wrapping subquery.</p>`,
    diagram: DIAGRAMS.window,
    examples: [
      [
        "running notional",
        "SELECT traded_at, isin, quantity * price AS notional,\n  sum(quantity * price) OVER (ORDER BY traded_at) AS running\nFROM trades\nWHERE price IS NOT NULL\nORDER BY traded_at",
      ],
      [
        "price change per isin",
        "SELECT isin, traded_at, price,\n  price - lag(price) OVER (PARTITION BY isin ORDER BY traded_at) AS change\nFROM trades\nWHERE price IS NOT NULL\nORDER BY isin, traded_at",
      ],
      [
        "latest per isin (QUALIFY)",
        "SELECT isin, traded_at, price\nFROM trades\nWHERE price IS NOT NULL\nQUALIFY row_number() OVER (PARTITION BY isin ORDER BY traded_at DESC) = 1\nORDER BY isin",
      ],
    ],
    ex: {
      task: "For each trader_id, return trader_id, trade_id and quantity of their single largest trade by quantity. Use row_number() over a partition by trader_id ordered by quantity DESC, keeping rank 1 (QUALIFY or a subquery both work).",
      solution:
        "SELECT trader_id, trade_id, quantity FROM trades QUALIFY row_number() OVER (PARTITION BY trader_id ORDER BY quantity DESC) = 1",
    },
  },
  {
    id: "setops",
    grp: "Advanced",
    lvl: "Advanced",
    title: "Set operations and grouping sets",
    prose: `<p><code>UNION</code> stacks results and removes duplicates; <code>UNION ALL</code> keeps them and is cheaper. <code>INTERSECT</code> and <code>EXCEPT</code> return common rows and differences. Column counts must match; DuckDB's <code>UNION ALL BY NAME</code> aligns columns by name instead of position.</p>
<p><code>GROUPING SETS</code>, <code>ROLLUP</code> and <code>CUBE</code> compute several <code>GROUP BY</code> levels in one statement. <code>ROLLUP (a, b)</code> produces groups for (a, b), (a) and the grand total; subtotal rows show NULL in the rolled-up columns.</p>`,
    diagram: DIAGRAMS.setops,
    examples: [
      [
        "except",
        "SELECT isin FROM instruments\nEXCEPT\nSELECT DISTINCT isin FROM trades",
      ],
      [
        "union all by name",
        "SELECT name, 'trader' AS kind FROM traders\nUNION ALL BY NAME\nSELECT 'instrument' AS kind, name FROM instruments\nORDER BY kind, name",
      ],
      [
        "rollup",
        "SELECT i.asset_class, t.side, sum(t.quantity) AS qty\nFROM trades t JOIN instruments i USING (isin)\nGROUP BY ROLLUP (i.asset_class, t.side)\nORDER BY i.asset_class NULLS LAST, t.side NULLS LAST",
      ],
    ],
    ex: {
      task: "Return the isin values that appear in trades with side 'BUY' INTERSECT those that appear with side 'SELL' (instruments traded in both directions).",
      solution:
        "SELECT isin FROM trades WHERE side = 'BUY' INTERSECT SELECT isin FROM trades WHERE side = 'SELL'",
    },
  },
  {
    id: "explain",
    grp: "Advanced",
    lvl: "Advanced",
    title: "EXPLAIN and the query plan",
    prose: `<p>Prefixing a query with <code>EXPLAIN</code> returns the physical plan instead of executing it: a tree of operators (scan, filter, projection, hash join, aggregate) read bottom-up. <code>EXPLAIN ANALYZE</code> runs the query and annotates each operator with actual row counts and timing.</p>
<p>Things to look for: filters pushed down into scans (less data read), join order and join type, and where cardinality estimates diverge from actual counts in <code>ANALYZE</code> output. The same reading skill transfers to SQL Server's plans, with different operator names.</p>`,
    examples: [
      [
        "plan of a join",
        "EXPLAIN\nSELECT tr.name, sum(t.quantity * t.price) AS notional\nFROM trades t\nJOIN traders tr USING (trader_id)\nWHERE t.price IS NOT NULL\nGROUP BY tr.name",
      ],
      [
        "analyze",
        "EXPLAIN ANALYZE\nSELECT isin, count(*) FROM trades GROUP BY isin",
      ],
      ["filter pushdown", "EXPLAIN\nSELECT * FROM trades WHERE side = 'BUY'"],
    ],
    ex: null,
  },
  {
    id: "sandbox",
    grp: "Sandbox",
    lvl: "All levels",
    title: "Sandbox",
    prose: `<p>A free workbench against the same in-browser database. DDL and DML work: create tables, insert, update, delete. The database lives in this page's memory; Reset data below restores the original tables.</p>`,
    examples: [
      [
        "summary",
        "SELECT i.asset_class, count(*) AS trades, sum(t.quantity) AS qty\nFROM trades t JOIN instruments i USING (isin)\nGROUP BY ALL ORDER BY qty DESC",
      ],
      [
        "make a view",
        "CREATE OR REPLACE VIEW priced AS\nSELECT * FROM trades WHERE price IS NOT NULL;\nFROM priced LIMIT 5",
      ],
      [
        "generate data",
        "SELECT range AS n, n * n AS square\nFROM range(1, 11)",
      ],
    ],
    ex: null,
    sandbox: true,
  },
];
