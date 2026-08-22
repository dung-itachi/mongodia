import subprocess, re, os, json
from collections import Counter, defaultdict

ROOT = r"d:\mongodia"
SRC = os.path.join(ROOT, "src")

# 1) Liệt kê file dùng i18n
i18n_files = []
for root, _, files in os.walk(SRC):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if not (f.endswith(".ts") or f.endswith(".tsx")):
            continue
        p = os.path.join(root, f)
        try:
            with open(p, "r", encoding="utf-8") as fp:
                content = fp.read()
        except Exception:
            continue
        if "useLanguageStore" in content or "from \"@/lib/i18n\"" in content or "from '@/lib/i18n'" in content:
            rel = p[len(ROOT)+1:].replace("\\", "/")
            # đếm t() / getTranslated / getTranslatedLabel
            t_count = len(re.findall(r"\bt\s*\(\s*['\"]", content))
            g_count = len(re.findall(r"getTranslated\s*\(\s*['\"]", content))
            gl_count = len(re.findall(r"getTranslatedLabel\s*\(\s*['\"]", content))
            trans_count = len(re.findall(r"<Trans[\s>]", content))
            i18n_files.append({
                "file": rel,
                "t_call": t_count,
                "getTranslated": g_count,
                "getTranslatedLabel": gl_count,
                "Trans": trans_count,
                "total_wrap": t_count + g_count + gl_count + trans_count,
            })

i18n_files.sort(key=lambda x: -x["total_wrap"])

# 2) Đếm key dictionary
with open(os.path.join(SRC, "lib", "i18n.ts"), "r", encoding="utf-8") as fp:
    i18n_content = fp.read()

vi_keys = set(re.findall(r'"([^"]+)"\s*:\s*"', i18n_content.split("en: {", 1)[0])) if "en: {" in i18n_content else set()
# Parse 3 dictionary blocks
def parse_block(text, lang_marker):
    m = re.search(rf"{lang_marker}:\s*\{{(.*?)\n  \}}", text, re.DOTALL)
    if not m:
        return set()
    block = m.group(1)
    keys = set(re.findall(r'"([^"]+)"\s*:\s*"', block))
    return keys

vi_dict = parse_block(i18n_content, "vi")
en_dict = parse_block(i18n_content, "en")
mn_dict = parse_block(i18n_content, "mn")

missing_in_en = vi_dict - en_dict
missing_in_mn = vi_dict - mn_dict
missing_in_vi = (en_dict | mn_dict) - vi_dict

# 3) Tổng label VN hardcode (string literal chứa chữ cái tiếng Việt, loại trừ prop / className / URL / code)
def count_vi_strings(content):
    # Lấy tất cả string literal "..."
    matches = re.findall(r'"([^"\n]{2,200})"', content)
    vn_count = 0
    for s in matches:
        if not re.search(r"[À-ỹ]", s):
            continue
        if s.startswith(("/", "http", "data:", "blob:", "css", "rgb", "#", "vi-VN", "en-US", "mn-MN", "yyyy", "dd/MM", "MM/dd", "HH:mm", "${", "{{")):
            continue
        if re.match(r"^[A-Z_][A-Z0-9_]{1,15}$", s):
            continue
        vn_count += 1
    return vn_count

route_stats = []
for root, _, files in os.walk(SRC):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if not (f.endswith(".tsx") or f.endswith(".ts")):
            continue
        p = os.path.join(root, f)
        try:
            with open(p, "r", encoding="utf-8") as fp:
                content = fp.read()
        except Exception:
            continue
        n_vn = count_vi_strings(content)
        if n_vn > 0:
            rel = p[len(ROOT)+1:].replace("\\", "/")
            route_stats.append((rel, n_vn))

route_stats.sort(key=lambda x: -x[1])
total_vn_labels = sum(c for _, c in route_stats)

# 4) Tính wrapped = tổng call getTranslated + getTranslatedLabel + t() + <Trans>
wrapped = sum(f["total_wrap"] for f in i18n_files)
unwrapped = total_vn_labels

# 5) Tính coverage theo route (mapping file → route dựa vào tree)
def map_to_route(rel_path):
    if "marketing" in rel_path: return "MKT"
    if "\\leads\\" in rel_path or "/leads/" in rel_path or "\\sale\\" in rel_path or "/sale/" in rel_path:
        return "SALE"
    if "\\customers\\" in rel_path or "/customers/" in rel_path: return "CUSTOMERS"
    if "\\orders\\" in rel_path or "/orders/" in rel_path: return "ORDERS"
    if "\\products\\" in rel_path or "/products/" in rel_path: return "PRODUCTS"
    if "\\gifts" in rel_path or "/gifts" in rel_path: return "PRODUCTS"
    if "\\accounts\\" in rel_path or "/accounts/" in rel_path: return "ACCOUNTS"
    if "\\account\\" in rel_path or "/account/" in rel_path: return "ACCOUNTS"
    if "\\teams\\" in rel_path or "/teams/" in rel_path: return "ACCOUNTS"
    if "\\leaders\\" in rel_path or "/leaders/" in rel_path: return "ACCOUNTS"
    if "\\employees\\" in rel_path or "/employees/" in rel_path: return "ACCOUNTS"
    if "\\warehouse" in rel_path or "/warehouse" in rel_path: return "WAREHOUSE"
    if "\\inventory\\" in rel_path or "/inventory/" in rel_path: return "WAREHOUSE"
    if "\\settings" in rel_path or "/settings" in rel_path: return "SETTINGS"
    if "\\roles" in rel_path or "/roles" in rel_path: return "SETTINGS"
    if "\\dashboard" in rel_path or "/dashboard" in rel_path: return "DASHBOARD"
    if "sidebar" in rel_path.lower() or "header" in rel_path.lower() or "layout" in rel_path.lower(): return "LAYOUT"
    if "common" in rel_path.lower(): return "COMMON"
    if "i18n" in rel_path.lower() or "language" in rel_path.lower(): return "LAYOUT"
    if "hooks" in rel_path.lower(): return "HOOKS"
    return "OTHER"

coverage = {}
for rel, c in route_stats:
    r = map_to_route(rel)
    coverage.setdefault(r, {"total_vi_labels": 0, "wrapped": 0, "unwrapped": 0, "files": []})
    coverage[r]["total_vi_labels"] += c
    coverage[r]["unwrapped"] += c

for f in i18n_files:
    r = map_to_route(f["file"])
    if r not in coverage:
        coverage[r] = {"total_vi_labels": 0, "wrapped": 0, "unwrapped": 0, "files": []}
    coverage[r]["wrapped"] += f["total_wrap"]
    coverage[r]["files"].append(f["file"])

# 6) Dead keys (key có trong vi nhưng không xuất hiện trong bất kỳ file nào dùng t/getTranslated)
all_files_text = ""
for root, _, files in os.walk(SRC):
    if "node_modules" in root or ".next" in root:
        continue
    for f in files:
        if not (f.endswith(".ts") or f.endswith(".tsx")):
            continue
        try:
            with open(os.path.join(root, f), "r", encoding="utf-8") as fp:
                all_files_text += "\n" + fp.read()
        except Exception:
            pass

dead_keys = []
for k in vi_dict | en_dict | mn_dict:
    if k and k not in all_files_text:
        dead_keys.append(k)

report = {
    "total_files_using_t": len(i18n_files),
    "total_vi_labels_in_source": total_vn_labels,
    "wrapped_labels": wrapped,
    "unwrapped_labels": unwrapped,
    "coverage_percent": round(100 * wrapped / max(1, wrapped + unwrapped), 1),
    "dictionary_keys": {
        "vi": len(vi_dict),
        "en": len(en_dict),
        "mn": len(mn_dict),
    },
    "missing_in_en": sorted(missing_in_en)[:30],
    "missing_in_en_count": len(missing_in_en),
    "missing_in_mn": sorted(missing_in_mn)[:30],
    "missing_in_mn_count": len(missing_in_mn),
    "missing_in_vi": sorted(missing_in_vi)[:30],
    "dead_keys_count": len(dead_keys),
    "dead_keys_sample": dead_keys[:30],
}

print("===== I18N AUDIT REPORT =====")
print(json.dumps(report, ensure_ascii=False, indent=2))

print("\n===== TOP 25 FILE CÓ NHIỀU LABEL HARDCODE =====")
for rel, c in route_stats[:25]:
    print(f"{c:5d}  {rel}")

print("\n===== COVERAGE THEO ROUTE =====")
print(f"{'Route':<12} {'TotalVN':>8} {'Wrapped':>8} {'Unwrap':>8} {'Cov%':>6}")
for r in ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]:
    if r in coverage:
        s = coverage[r]
        cov = round(100*s["wrapped"]/max(1,s["wrapped"]+s["unwrapped"]),1)
        print(f"{r:<12} {s['total_vi_labels']:>8} {s['wrapped']:>8} {s['unwrapped']:>8} {cov:>5}%")

# Save artifacts
import os
os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)

with open(os.path.join(ROOT, "docs", "i18n-audit.md"), "w", encoding="utf-8") as f:
    f.write(f"""# i18n Audit Report

> Auto-generated bởi Prompt A — `verify-i18n-audit.py`.
> Ngày tạo: 2026-08-22.

## 1. Tổng quan

| Chỉ số | Giá trị |
|---|---|
| Tổng file `.ts/.tsx` có dùng i18n | **{len(i18n_files)}** |
| Tổng label VN hardcode (ước lượng) | **{total_vn_labels}** |
| Label đã được wrap (`t()` / `getTranslated()` / `<Trans>`) | **{wrapped}** |
| Label chưa wrap | **{unwrapped}** |
| **Coverage** | **{report['coverage_percent']}%** |
| Số key trong `vi` | **{len(vi_dict)}** |
| Số key trong `en` | **{len(en_dict)}** |
| Số key trong `mn` | **{len(mn_dict)}** |
| Key có trong `vi` nhưng thiếu trong `en` | **{len(missing_in_en)}** |
| Key có trong `vi` nhưng thiếu trong `mn` | **{len(missing_in_mn)}** |
| Dead keys (có trong dict nhưng không ai tham chiếu) | **{len(dead_keys)}** |

## 2. Phân loại file dùng i18n

| File | `t()` | `getTranslated()` | `getTranslatedLabel()` | `<Trans>` | Tổng |
|---|---:|---:|---:|---:|---:|
""")
    for f in i18n_files:
        f["file"]
        f["t_call"]
        f["getTranslated"]
        f["getTranslatedLabel"]
        f["Trans"]
        f["total_wrap"]
        f["file"]
        f["t_call"]
        f["getTranslated"]
        f["getTranslatedLabel"]
        f["Trans"]
        f["total_wrap"]
    for fobj in i18n_files:
        f.write(f"| `{fobj['file']}` | {fobj['t_call']} | {fobj['getTranslated']} | {fobj['getTranslatedLabel']} | {fobj['Trans']} | {fobj['total_wrap']} |\n")

    f.write(f"""
## 3. Top 30 file có nhiều label hardcode nhất

| File | Số label VN hardcode |
|---|---:|
""")
    for rel, c in route_stats[:30]:
        f.write(f"| `{rel}` | {c} |\n")

    f.write(f"""
## 4. Coverage theo route

| Route | Tổng VN | Wrapped | Unwrapped | Coverage |
|---|---:|---:|---:|---:|
""")
    for r in ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]:
        if r in coverage:
            s = coverage[r]
            cov = round(100*s["wrapped"]/max(1,s["wrapped"]+s["unwrapped"]),1)
            f.write(f"| {r} | {s['total_vi_labels']} | {s['wrapped']} | {s['unwrapped']} | {cov}% |\n")

    f.write(f"""
## 5. Key thiếu trong từng ngôn ngữ

### 5.1 Có trong `vi`/`mn` nhưng thiếu trong `en` ({len(missing_in_en)} keys)
""")
    for k in sorted(missing_in_en):
        f.write(f"- `{k}`\n")
    f.write(f"""
### 5.2 Có trong `vi` nhưng thiếu trong `mn` ({len(missing_in_mn)} keys)
""")
    for k in sorted(missing_in_mn):
        f.write(f"- `{k}`\n")
    f.write(f"""
### 5.3 Có trong `en`/`mn` nhưng thiếu trong `vi` ({len(missing_in_vi)} keys)
""")
    for k in sorted(missing_in_vi):
        f.write(f"- `{k}`\n")
    f.write(f"""
## 6. Dead keys (không ai tham chiếu)

Có {len(dead_keys)} key trong dictionary KHÔNG xuất hiện ở bất kỳ file `.ts/.tsx` nào.

Có thể là:
- Key đã bị xóa code nhưng quên xóa trong `i18n.ts`.
- Key chỉ dùng cho 1 file đã refactor.

Sample (top 30):
""")
    for k in dead_keys[:30]:
        f.write(f"- `{k}`\n")

# CSV
import csv
with open(os.path.join(ROOT, "docs", "i18n-coverage.csv"), "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f)
    w.writerow(["route", "total_vi_labels", "wrapped", "unwrapped", "coverage_percent"])
    for r in ["DASHBOARD","LAYOUT","COMMON","MKT","SALE","CUSTOMERS","ORDERS","PRODUCTS","ACCOUNTS","WAREHOUSE","SETTINGS","HOOKS","OTHER"]:
        if r in coverage:
            s = coverage[r]
            cov = round(100*s["wrapped"]/max(1,s["wrapped"]+s["unwrapped"]),1)
            w.writerow([r, s["total_vi_labels"], s["wrapped"], s["unwrapped"], cov])

print("\nSaved: docs/i18n-audit.md and docs/i18n-coverage.csv")
