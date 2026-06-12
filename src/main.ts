import "./style.css";
import { LESSONS, type Lesson } from "./lessons";
import { boot, exec, seed, type QueryResult } from "./db";

let engineReady = false;
let current: Lesson | null = null;

const nav = document.getElementById("nav")!;
const main = document.getElementById("main")!;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildNav(): void {
  let grp = "";
  for (const L of LESSONS) {
    if (L.grp !== grp) {
      grp = L.grp;
      const g = document.createElement("div");
      g.className = "grp";
      g.textContent = grp;
      nav.appendChild(g);
    }
    const b = document.createElement("button");
    b.textContent = L.title;
    b.dataset.id = L.id;
    b.onclick = () => show(L.id);
    nav.appendChild(b);
  }
}

function show(id: string): void {
  current = LESSONS.find((l) => l.id === id) ?? LESSONS[0];
  const L = current;
  nav
    .querySelectorAll("button")
    .forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  main.innerHTML = `
  <article class="lesson">
    <div class="lvl">${L.grp} · ${L.lvl}</div>
    <h2>${L.title}</h2>
    <div class="prose">${L.prose}</div>
    ${L.diagram ? `<figure class="diagram">${L.diagram}</figure>` : ""}
    <div class="chips">${L.examples
      .map((e, i) => `<button class="chip" data-i="${i}">${esc(e[0])}</button>`)
      .join("")}</div>
    <div class="bench">
      <div class="bar">
        <button class="btn run" id="run" ${engineReady ? "" : "disabled"}>Run</button>
        ${L.sandbox ? '<button class="btn ghost" id="reset">Reset data</button>' : ""}
        <span class="hint">Ctrl/Cmd + Enter runs</span>
      </div>
      <textarea id="sql" spellcheck="false" aria-label="SQL editor"></textarea>
      <div class="out" id="out"></div>
    </div>
    ${
      L.ex
        ? `<div class="ex"><h3>Exercise</h3><p>${L.ex.task}</p>
      <button class="btn run" id="check" ${engineReady ? "" : "disabled"}>Check my query</button>
      <button class="btn ghost" id="sol">Show solution</button>
      <div id="verdict"></div></div>`
        : ""
    }
    <details class="schema"><summary>Dataset reference</summary><div class="cards" id="cards"></div></details>
  </article>`;

  const ta = document.getElementById("sql") as HTMLTextAreaElement;
  ta.value = L.examples[0][1];
  main.querySelectorAll<HTMLButtonElement>(".chip").forEach(
    (c) =>
      (c.onclick = () => {
        ta.value = L.examples[Number(c.dataset.i)][1];
        ta.focus();
      }),
  );
  document.getElementById("run")!.onclick = () => void runEditor();
  ta.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void runEditor();
    }
  });
  if (L.ex) {
    document.getElementById("check")!.onclick = () => void checkExercise();
    document.getElementById("sol")!.onclick = () => {
      ta.value = L.ex!.solution;
      void runEditor();
    };
  }
  if (L.sandbox) {
    document.getElementById("reset")!.onclick = async () => {
      await seed();
      await refreshSchemaCards();
      out(`<div class="meta">data restored</div>`);
    };
  }
  void refreshSchemaCards();
}

function out(html: string): void {
  const o = document.getElementById("out");
  if (o) o.innerHTML = html;
}

function tableHtml(cols: string[], rows: (string | null)[][]): string {
  const head = cols.map((c) => `<th>${esc(c)}</th>`).join("");
  const body = rows
    .slice(0, 500)
    .map(
      (r) =>
        "<tr>" +
        r
          .map((v) =>
            v === null ? '<td class="null">NULL</td>' : `<td>${esc(v)}</td>`,
          )
          .join("") +
        "</tr>",
    )
    .join("");
  const more =
    rows.length > 500
      ? `<div class="meta">showing first 500 of ${rows.length}</div>`
      : "";
  return `<div class="tablewrap"><table class="res"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>${more}`;
}

async function runEditor(): Promise<void> {
  const sql = (document.getElementById("sql") as HTMLTextAreaElement).value.trim();
  if (!sql || !engineReady) return;
  const t0 = performance.now();
  try {
    const { cols, rows } = await exec(sql);
    const ms = (performance.now() - t0).toFixed(1);
    if (cols.length === 2 && cols[0] === "explain_key") {
      out(
        `<div class="meta">plan · ${ms} ms</div><pre class="plan">${esc(rows.map((r) => r[1] ?? "").join("\n"))}</pre>`,
      );
    } else {
      out(
        `<div class="meta">${rows.length} row${rows.length === 1 ? "" : "s"} · ${ms} ms</div>` +
          tableHtml(cols, rows),
      );
    }
    void refreshSchemaCards();
  } catch (e) {
    out(`<div class="err">${esc(String((e as Error).message ?? e))}</div>`);
  }
}

function canon(r: QueryResult, ordered?: boolean): string {
  const s = r.rows.map((row) => JSON.stringify(row));
  if (!ordered) s.sort();
  return JSON.stringify({ c: r.cols.map((c) => c.toLowerCase()), r: s });
}

async function checkExercise(): Promise<void> {
  const L = current;
  if (!L?.ex || !engineReady) return;
  const v = document.getElementById("verdict")!;
  const sql = (document.getElementById("sql") as HTMLTextAreaElement).value.trim();
  if (!sql) {
    v.innerHTML = `<div class="fail">The editor is empty. Write your query above, then check.</div>`;
    return;
  }
  try {
    const got = await exec(sql);
    const want = await exec(L.ex.solution);
    if (canon(got, L.ex.ordered) === canon(want, L.ex.ordered)) {
      v.innerHTML = `<div class="pass">Correct — result matches.</div>`;
    } else {
      v.innerHTML = `<div class="fail">Not yet. Got ${got.rows.length} row(s) with columns (${got.cols.join(", ")}); expected ${want.rows.length} row(s) with columns (${want.cols.join(", ")}). Run your query above to inspect the output.</div>`;
    }
  } catch (e) {
    v.innerHTML = `<div class="fail">Query error: ${esc(String((e as Error).message ?? e))}</div>`;
  }
}

async function refreshSchemaCards(): Promise<void> {
  const el = document.getElementById("cards");
  if (!el || !engineReady) return;
  try {
    const tabs = await exec(`SELECT table_name FROM information_schema.tables
      WHERE table_schema='main' AND table_type IN ('BASE TABLE','VIEW') ORDER BY table_name`);
    let html = "";
    for (const [t] of tabs.rows) {
      const cols = await exec(`SELECT column_name, data_type FROM information_schema.columns
        WHERE table_name='${t}' ORDER BY ordinal_position`);
      const cnt = await exec(`SELECT count(*) FROM "${t}"`);
      html += `<div class="card"><h4>${esc(t ?? "")} · ${cnt.rows[0][0]} rows</h4>
        <ul>${cols.rows
          .map(
            (c) =>
              `<li><b>${esc(c[0] ?? "")}</b> ${esc((c[1] ?? "").toLowerCase())}</li>`,
          )
          .join("")}</ul>
        <button class="chip peek" data-t="${esc(t ?? "")}">peek 5 rows</button></div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll<HTMLButtonElement>(".peek").forEach(
      (b) =>
        (b.onclick = () => {
          (document.getElementById("sql") as HTMLTextAreaElement).value =
            `FROM "${b.dataset.t}" LIMIT 5`;
          void runEditor();
        }),
    );
  } catch {
    /* schema panel is best-effort */
  }
}

buildNav();
show("select");

boot()
  .then((version) => {
    engineReady = true;
    document.getElementById("status")!.classList.add("ok");
    document.getElementById("statusText")!.textContent =
      `DuckDB ${version} · in-browser`;
    document.getElementById("duck")!.classList.remove("bob");
    document
      .querySelectorAll<HTMLButtonElement>(".btn.run")
      .forEach((b) => (b.disabled = false));
    void refreshSchemaCards();
  })
  .catch((e: Error) => {
    document.getElementById("statusText")!.textContent =
      "engine failed to load";
    out(
      `<div class="err">DuckDB-WASM could not be loaded: ${esc(String(e.message ?? e))}\nCheck the network connection and reload the page.</div>`,
    );
  });
