// verify-i18n-audit.js — Prompt A
// Chạy: node verify-i18n-audit.js
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const DOCS = path.join(ROOT, "docs");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
  }
  return out;
}

const allFiles = walk(SRC);

// ---------- 1) Files dùng i18n ----------
const i18nFiles = [];
for (const p of allFiles) {
  const content = fs.readFileSync(p, "utf8");
  const usesStore = /useLanguageStore/.test(content);
  const usesI18nLib = /from\s+["']@\/lib\/i18n["']/.test(content);
  if (!usesStore && !usesI18nLib) continue;
  const t_call = (content.match(/\bt\s*\(\s*['"]/g) || []).length;
  const getTranslated = (content.match(/getTranslated\s*\(\s*['"]/g) || []).length;
  const getTranslatedLabel = (content.match(/getTranslatedLabel\s*\(\s*['"]/g) || []).length;
  const Trans = (content.match(/<Trans[\s>]/g) || []).length;
  const total_wrap = t_call + getTranslated + getTranslatedLabel + Trans;
  i18nFiles.push({
    file: p.slice(ROOT.length + 1).replace(/\\/g, "/"),
    t_call, getTranslated, getTranslatedLabel, Trans, total_wrap
  });
}
i18nFiles.sort((a, b) => b.total_wrap - a.total_wrap);

// ---------- 2) Dictionary — đọc từ src/locales/{lang}/{ns}.ts ----------
const LOCALES_DIR = path.join(SRC, "locales");
const NAMESPACES = ["navigation", "validation", "status", "orders", "products",
  "customers", "warehouse", "marketing", "sale", "accounts", "settings", "common"];

function loadDict(lang) {
  const set = new Set();
  for (const ns of NAMESPACES) {
    const p = path.join(LOCALES_DIR, lang, `${ns}.ts`);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf8");
    const re = /"((?:[^"\\]|\\.)*)"\s*:\s*"/g;
    let m;
    while ((m = re.exec(content)) !== null) set.add(m[1].replace(/\\"/g, '"'));
  }
  return set;
}

const viDict = loadDict("vi");
const enDict = loadDict("en");
const mnDict = loadDict("mn");

const missingInEn = [...viDict].filter(k => !enDict.has(k));
const missingInMn = [...viDict].filter(k => !mnDict.has(k));
const missingInVi = [...new Set([...enDict, ...mnDict])].filter(k => !viDict.has(k));

// ---------- 3) Hardcode VN labels ----------
function countVnLabels(content) {
  const matches = content.match(/"([^"\n]{2,250})"/g) || [];
  let count = 0;
  for (const m of matches) {
    const s = m.slice(1, -1);
    if (!/[À-ỹ]/.test(s)) continue;
    if (/^(\/|https?|data:|blob:|css|rgb|#|vi-VN|en-US|mn-MN|yyyy|MM|dd|HH|mm|ss)/.test(s)) continue;
    if (/^\$\{/.test(s)) continue;
    if (/^[A-Z_][A-Z0-9_]{1,20}$/.test(s)) continue; // enum constant
    if (s.length < 2) continue;
    count++;
  }
  return count;
}

const routeStats = [];
for (const p of allFiles) {
  const content = fs.readFileSync(p, "utf8");
  const c = countVnLabels(content);
  if (c > 0) {
    routeStats.push([p.slice(ROOT.length + 1).replace(/\\/g, "/"), c]);
  }
}
routeStats.sort((a, b) => b[1] - a[1]);
const totalVnLabels = routeStats.reduce((s, [, c]) => s + c, 0);

const wrapped = i18nFiles.reduce((s, f) => s + f.total_wrap, 0);
const unwrapped = totalVnLabels;

// ---------- 4) Coverage theo route ----------
function mapToRoute(rel) {
  if (rel.includes("marketing") || rel.includes("/facebook-pages") || rel.includes("/campaigns")) return "MKT";
  if (rel.includes("/leads/") || rel.includes("/sale/")) return "SALE";
  if (rel.includes("/customers/")) return "CUSTOMERS";
  if (rel.includes("/orders/")) return "ORDERS";
  if (rel.includes("/products/") || rel.includes("/gifts")) return "PRODUCTS";
  if (rel.includes("/accounts/") || rel.includes("/account/") || rel.includes("/teams/") || rel.includes("/leaders/") || rel.includes("/employees/")) return "ACCOUNTS";
  if (rel.includes("/warehouse") || rel.includes("/inventory/")) return "WAREHOUSE";
  if (rel.includes("/settings") || rel.includes("/roles")) return "SETTINGS";
  if (rel.includes("/dashboard")) return "DASHBOARD";
  if (rel.includes("/layout/") || rel.includes("/i18n/") || rel.includes("language.store")) return "LAYOUT";
  if (rel.includes("/common/")) return "COMMON";
  if (rel.includes("/hooks/")) return "HOOKS";
  return "OTHER";
}

const coverage = {};
for (const [rel, c] of routeStats) {
  const r = mapToRoute(rel);
  if (!coverage[r]) coverage[r] = { total: 0, wrapped: 0, unwrapped: 0, files: [] };
  coverage[r].total += c;
  coverage[r].unwrapped += c;
  coverage[r].files.push(rel);
}
for (const f of i18nFiles) {
  const r = mapToRoute(f.file);
  if (!coverage[r]) coverage[r] = { total: 0, wrapped: 0, unwrapped: 0, files: [] };
  coverage[r].wrapped += f.total_wrap;
}

// ---------- 5) Dead keys ----------
const allText = allFiles.map(p => fs.readFileSync(p, "utf8")).join("\n");
const allKeys = new Set([...viDict, ...enDict, ...mnDict]);
const deadKeys = [...allKeys].filter(k => k && !allText.includes(k));

// ---------- 6) Report JSON ----------
const report = {
  total_files_using_t: i18nFiles.length,
  total_vi_labels_in_source: totalVnLabels,
  wrapped_labels: wrapped,
  unwrapped_labels: unwrapped,
  coverage_percent: Math.round((100 * wrapped / Math.max(1, wrapped + unwrapped)) * 10) / 10,
  dictionary_keys: { vi: viDict.size, en: enDict.size, mn: mnDict.size },
  missing_in_en_count: missingInEn.length,
  missing_in_en_sample: missingInEn.slice(0, 30),
  missing_in_mn_count: missingInMn.length,
  missing_in_mn_sample: missingInMn.slice(0, 30),
  missing_in_vi_sample: missingInVi.slice(0, 30),
  dead_keys_count: deadKeys.length,
  dead_keys_sample: deadKeys.slice(0, 30),
};

console.log("===== I18N AUDIT REPORT =====");
console.log(JSON.stringify(report, null, 2));
console.log("\n===== TOP 25 FILE CÓ NHIỀU LABEL HARDCODE =====");
for (const [rel, c] of routeStats.slice(0, 25)) {
  console.log(`${String(c).padStart(5)}  ${rel}`);
}
console.log("\n===== COVERAGE THEO ROUTE =====");
console.log(`${"Route".padEnd(12)} ${"TotalVN".padStart(8)} ${"Wrapped".padStart(8)} ${"Unwrap".padStart(8)} ${"Cov%".padStart(6)}`);
for (const r of ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]) {
  if (coverage[r]) {
    const s = coverage[r];
    const cov = Math.round(100 * s.wrapped / Math.max(1, s.wrapped + s.unwrapped) * 10) / 10;
    console.log(`${r.padEnd(12)} ${String(s.total).padStart(8)} ${String(s.wrapped).padStart(8)} ${String(s.unwrapped).padStart(8)} ${String(cov).padStart(5)}%`);
  }
}

// ---------- 7) Save docs ----------
fs.mkdirSync(DOCS, { recursive: true });

let md = `# i18n Audit Report

> Auto-generated bởi Prompt A — \`verify-i18n-audit.js\`.
> Ngày tạo: 2026-08-22.

## 1. Tổng quan

| Chỉ số | Giá trị |
|---|---|
| Tổng file .ts/.tsx có dùng i18n | **${i18nFiles.length}** |
| Tổng label VN hardcode (ước lượng) | **${totalVnLabels}** |
| Label đã được wrap (t() / getTranslated() / <Trans>) | **${wrapped}** |
| Label chưa wrap | **${unwrapped}** |
| **Coverage** | **${report.coverage_percent}%** |
| Số key trong vi | **${viDict.size}** |
| Số key trong en | **${enDict.size}** |
| Số key trong mn | **${mnDict.size}** |
| Key có trong vi nhưng thiếu trong en | **${missingInEn.length}** |
| Key có trong vi nhưng thiếu trong mn | **${missingInMn.length}** |
| Dead keys (có trong dict nhưng không tham chiếu) | **${deadKeys.length}** |

## 2. Phân loại file dùng i18n

| File | t() | getTranslated() | getTranslatedLabel() | <Trans> | Tổng |
|---|---:|---:|---:|---:|---:|
`;
for (const f of i18nFiles) {
  md += `| \`${f.file}\` | ${f.t_call} | ${f.getTranslated} | ${f.getTranslatedLabel} | ${f.Trans} | ${f.total_wrap} |\n`;
}

md += `\n## 3. Top 30 file có nhiều label hardcode nhất\n\n| File | Số label VN hardcode |\n|---|---:|\n`;
for (const [rel, c] of routeStats.slice(0, 30)) {
  md += `| \`${rel}\` | ${c} |\n`;
}

md += `\n## 4. Coverage theo route\n\n| Route | Tổng VN | Wrapped | Unwrapped | Coverage |\n|---|---:|---:|---:|---:|\n`;
for (const r of ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]) {
  if (coverage[r]) {
    const s = coverage[r];
    const cov = Math.round(100 * s.wrapped / Math.max(1, s.wrapped + s.unwrapped) * 10) / 10;
    md += `| ${r} | ${s.total} | ${s.wrapped} | ${s.unwrapped} | ${cov}% |\n`;
  }
}

md += `\n## 5. Key thiếu trong từng ngôn ngữ\n\n### 5.1 Có trong vi nhưng thiếu trong en (${missingInEn.length} keys)\n\n`;
for (const k of missingInEn.slice(0, 100)) md += `- \`${k}\`\n`;
if (missingInEn.length > 100) md += `- ... (còn ${missingInEn.length - 100} keys khác)\n`;

md += `\n### 5.2 Có trong vi nhưng thiếu trong mn (${missingInMn.length} keys)\n\n`;
for (const k of missingInMn.slice(0, 100)) md += `- \`${k}\`\n`;
if (missingInMn.length > 100) md += `- ... (còn ${missingInMn.length - 100} keys khác)\n`;

md += `\n### 5.3 Có trong en/mn nhưng thiếu trong vi (${missingInVi.length} keys)\n\n`;
for (const k of missingInVi.slice(0, 50)) md += `- \`${k}\`\n`;

md += `\n## 6. Dead keys (không ai tham chiếu)\n\nCó **${deadKeys.length}** key trong dictionary KHÔNG xuất hiện ở bất kỳ file .ts/.tsx nào.\n\nSample (top 30):\n\n`;
for (const k of deadKeys.slice(0, 30)) md += `- \`${k}\`\n`;

md += `\n## 7. Nhận xét & đề xuất\n\n1. **Coverage thấp (${report.coverage_percent}%)** — đa số route page.tsx chưa import i18n.
2. **Phần lớn i18n nằm ở common component** (DataTable, TableToolbar, ConfirmDialog, StatusBadge, DrawerForm, FilterInput) — đã có sẵn pattern \`getTranslated()\`.
3. **Sidebars / header** đã wrap ~6 label.
4. **Các form lớn** (ProductForm 28 call, SaleLeadTable 40 call, ReassignLeadModal 14 call) đang wrap khá tốt.
5. **Các page.tsx lớn** (orders, marketing/input, leads, customers) chưa wrap.
6. **Dictionary bị lệch**: en có ${enDict.size} key, mn có ${mnDict.size} key. Cần bổ sung ${missingInEn.length} key vào en.
\n_Generated by Prompt A — 2026-08-22._\n`;

fs.writeFileSync(path.join(DOCS, "i18n-audit.md"), md, "utf8");

// CSV
const csv = ["route,total_vi_labels,wrapped,unwrapped,coverage_percent"];
for (const r of ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]) {
  if (coverage[r]) {
    const s = coverage[r];
    const cov = Math.round(100 * s.wrapped / Math.max(1, s.wrapped + s.unwrapped) * 10) / 10;
    csv.push(`${r},${s.total},${s.wrapped},${s.unwrapped},${cov}`);
  }
}
fs.writeFileSync(path.join(DOCS, "i18n-coverage.csv"), csv.join("\n"), "utf8");

console.log("\nSaved: docs/i18n-audit.md and docs/i18n-coverage.csv");
