/**
 * Inline SVG concept diagrams shown between a lesson's prose and its
 * examples. Colors come from the site's CSS variables, so the diagrams
 * follow the theme and ship with no extra assets.
 */

const KEEP_FILL = "rgba(95,179,154,.18)";
const KEEP_STROKE = "var(--green)";
const DIM_FILL = "var(--surface-2)";
const DIM_STROKE = "var(--line)";
const RUST_FILL = "rgba(217,108,79,.18)";
const ACCENT_FILL = "rgba(232,185,49,.12)";

function svg(w: number, h: number, label: string, body: string): string {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>`;
}

function txt(
  x: number,
  y: number,
  s: string,
  size = 11,
  fill = "var(--text)",
  anchor = "start",
): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
}

function rowBox(
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  kept: boolean,
): string {
  const body =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${kept ? KEEP_FILL : DIM_FILL}" stroke="${kept ? KEEP_STROKE : DIM_STROKE}"/>` +
    txt(x + w / 2, y + h / 2 + 4, label, 11, "var(--text)", "middle");
  return kept ? body : `<g opacity=".4">${body}</g>`;
}

/* ---------- joins: INNER / LEFT / ANTI ---------- */

const ROW_W = 62;
const ROW_H = 24;
const slotY = (i: number) => 40 + i * 32;

interface JoinPanel {
  ox: number;
  name: string;
  caption: string;
  left: boolean[]; // kept flags for left rows id 1..3
  right: boolean[]; // kept flags for right rows id 1, 2, 4
  matchesKept: boolean;
  nullRow: boolean; // dashed NULL companion for unmatched left row
}

function joinPanel(p: JoinPanel): string {
  const L = p.ox + 8;
  const R = p.ox + 155;
  let s = txt(p.ox + 8, 16, p.name, 12, "var(--accent)");
  s += txt(L + ROW_W / 2, 33, "traders", 10, "var(--text-dim)", "middle");
  s += txt(R + ROW_W / 2, 33, "trades", 10, "var(--text-dim)", "middle");
  for (const i of [0, 1]) {
    const y = slotY(i) + ROW_H / 2;
    s += `<line x1="${L + ROW_W}" y1="${y}" x2="${R}" y2="${y}" stroke="${p.matchesKept ? "var(--accent)" : "var(--line)"}" stroke-width="1.5"${p.matchesKept ? "" : ' opacity=".5"'}/>`;
  }
  ["id 1", "id 2", "id 3"].forEach((id, i) => {
    s += rowBox(L, slotY(i), ROW_W, ROW_H, id, p.left[i]);
  });
  s += rowBox(R, slotY(0), ROW_W, ROW_H, "id 1", p.right[0]);
  s += rowBox(R, slotY(1), ROW_W, ROW_H, "id 2", p.right[1]);
  s += rowBox(R, slotY(3), ROW_W, ROW_H, "id 4", p.right[2]);
  if (p.nullRow) {
    const y = slotY(2);
    s += `<line x1="${L + ROW_W}" y1="${y + ROW_H / 2}" x2="${R}" y2="${y + ROW_H / 2}" stroke="var(--text-dim)" stroke-dasharray="4 3"/>`;
    s += `<rect x="${R}" y="${y}" width="${ROW_W}" height="${ROW_H}" rx="5" fill="none" stroke="var(--text-dim)" stroke-dasharray="4 3"/>`;
    s += txt(R + ROW_W / 2, y + 16, "NULL", 11, "var(--text-dim)", "middle");
  }
  s += txt(p.ox + 8, 192, p.caption, 10.5, "var(--text-dim)");
  return s;
}

const JOIN_SVG = svg(
  705,
  205,
  "How INNER, LEFT and ANTI joins treat matching and non-matching rows",
  [
    joinPanel({
      ox: 0,
      name: "INNER JOIN",
      caption: "matching pairs only",
      left: [true, true, false],
      right: [true, true, false],
      matchesKept: true,
      nullRow: false,
    }),
    joinPanel({
      ox: 240,
      name: "LEFT JOIN",
      caption: "every left row · no match → NULL",
      left: [true, true, true],
      right: [true, true, false],
      matchesKept: true,
      nullRow: true,
    }),
    joinPanel({
      ox: 480,
      name: "ANTI JOIN",
      caption: "left rows with no match",
      left: [false, false, true],
      right: [false, false, false],
      matchesKept: false,
      nullRow: false,
    }),
  ].join(""),
);

/* ---------- GROUP BY: rows collapse into one row per group ---------- */

function groupSvg(): string {
  const rows: [string, boolean][] = [
    ["BUY 100", true],
    ["SELL 40", false],
    ["BUY 250", true],
    ["BUY 30", true],
    ["SELL 75", false],
    ["BUY 120", true],
  ];
  const boxY = (buy: boolean) => (buy ? 62 : 138);
  let s = txt(30, 16, "6 rows", 10, "var(--text-dim)");
  s += txt(300, 16, "GROUP BY side", 11, "var(--accent)", "middle");
  s += txt(450, 16, "one row per group", 10, "var(--text-dim)");
  rows.forEach(([label, buy], i) => {
    const y = 28 + i * 28;
    const stroke = buy ? KEEP_STROKE : "var(--rust)";
    s += `<path d="M126 ${y + 11} C 290 ${y + 11}, 310 ${boxY(buy) + 15}, 450 ${boxY(buy) + 15}" fill="none" stroke="${stroke}" opacity=".5"/>`;
    s += `<rect x="30" y="${y}" width="96" height="22" rx="5" fill="${buy ? KEEP_FILL : RUST_FILL}" stroke="${stroke}"/>`;
    s += txt(78, y + 15, label, 11, "var(--text)", "middle");
  });
  for (const buy of [true, false]) {
    const y = boxY(buy);
    s += `<rect x="450" y="${y}" width="185" height="30" rx="5" fill="${buy ? KEEP_FILL : RUST_FILL}" stroke="${buy ? KEEP_STROKE : "var(--rust)"}"/>`;
    s += txt(542, y + 19, buy ? "BUY · count(*) = 4" : "SELL · count(*) = 2", 11, "var(--text)", "middle");
  }
  s += txt(30, 212, "WHERE filters rows before grouping · HAVING filters the groups afterwards", 10.5, "var(--text-dim)");
  return svg(705, 220, "GROUP BY collapses rows sharing a key into one row per group", s);
}

/* ---------- window functions: rows preserved, a column added ---------- */

function windowSvg(): string {
  const parts: [string, [string, number][]][] = [
    ["isin = 'AAA'", [["09:01 · qty 100", 100], ["09:05 · qty 150", 250], ["09:09 · qty 80", 330]]],
    ["isin = 'BBB'", [["09:02 · qty 40", 40], ["09:06 · qty 75", 115], ["09:11 · qty 80", 195]]],
  ];
  let s = txt(170, 18, "rows stay rows", 10, "var(--text-dim)");
  s += txt(368, 18, "running sum(qty)", 10, "var(--accent)");
  parts.forEach(([label, rows], p) => {
    const top = 30 + p * 98;
    s += `<line x1="164" y1="${top}" x2="164" y2="${top + 78}" stroke="var(--line)"/>`;
    s += txt(156, top + 47, label, 10.5, "var(--text-dim)", "end");
    rows.forEach(([base, running], i) => {
      const y = top + i * 28;
      s += `<rect x="170" y="${y}" width="190" height="22" rx="5" fill="${DIM_FILL}" stroke="${DIM_STROKE}"/>`;
      s += txt(265, y + 15, base, 11, "var(--text)", "middle");
      s += `<rect x="368" y="${y}" width="110" height="22" rx="5" fill="${ACCENT_FILL}" stroke="var(--accent)"/>`;
      s += txt(423, y + 15, String(running), 11, "var(--text)", "middle");
    });
    s += `<line x1="494" y1="${top + 6}" x2="494" y2="${top + 64}" stroke="var(--text-dim)"/>`;
    s += `<path d="M490 ${top + 64} L498 ${top + 64} L494 ${top + 72} Z" fill="var(--text-dim)"/>`;
    if (p === 0) s += txt(504, top + 43, "ORDER BY traded_at", 10, "var(--text-dim)");
  });
  s += txt(30, 230, "PARTITION BY splits, ORDER BY positions — every row survives; GROUP BY would collapse each partition", 10.5, "var(--text-dim)");
  return svg(705, 238, "A window function adds a per-row value over a partition without collapsing rows", s);
}

/* ---------- set operations: UNION / INTERSECT / EXCEPT ---------- */

function vennPanel(
  ox: number,
  name: string,
  caption: string,
  mode: "union" | "intersect" | "except",
): string {
  const cy = 96;
  const r = 42;
  const ax = ox + 88;
  const bx = ox + 142;
  const tint = "rgba(95,179,154,.28)";
  let fill = "";
  if (mode === "union") {
    fill = `<circle cx="${ax}" cy="${cy}" r="${r}" fill="${tint}"/><circle cx="${bx}" cy="${cy}" r="${r}" fill="${tint}"/>`;
  } else if (mode === "intersect") {
    fill = `<clipPath id="so-i"><circle cx="${bx}" cy="${cy}" r="${r}"/></clipPath><circle cx="${ax}" cy="${cy}" r="${r}" fill="${tint}" clip-path="url(#so-i)"/>`;
  } else {
    fill = `<mask id="so-e"><rect x="${ox}" y="${cy - r - 6}" width="225" height="${2 * r + 12}" fill="#fff"/><circle cx="${bx}" cy="${cy}" r="${r}" fill="#000"/></mask><circle cx="${ax}" cy="${cy}" r="${r}" fill="${tint}" mask="url(#so-e)"/>`;
  }
  return (
    txt(ox + 8, 16, name, 12, "var(--accent)") +
    fill +
    `<circle cx="${ax}" cy="${cy}" r="${r}" fill="none" stroke="var(--text-dim)"/>` +
    `<circle cx="${bx}" cy="${cy}" r="${r}" fill="none" stroke="var(--text-dim)"/>` +
    txt(ax - 24, cy + 4, "A", 12, "var(--text)") +
    txt(bx + 16, cy + 4, "B", 12, "var(--text)") +
    txt(ox + 8, 172, caption, 10.5, "var(--text-dim)")
  );
}

const SETOPS_SVG = svg(
  705,
  185,
  "UNION keeps rows from both inputs, INTERSECT only common rows, EXCEPT rows unique to the first",
  vennPanel(0, "UNION", "rows from both · dedup", "union") +
    vennPanel(240, "INTERSECT", "only rows in both", "intersect") +
    vennPanel(480, "EXCEPT", "rows in A but not in B", "except"),
);

export const DIAGRAMS: Record<string, string> = {
  join: JOIN_SVG,
  group: groupSvg(),
  window: windowSvg(),
  setops: SETOPS_SVG,
};
