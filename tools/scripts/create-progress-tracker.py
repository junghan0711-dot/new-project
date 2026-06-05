#!/usr/bin/env python3
"""Create a GitHub Pages progress-tracker tool from an Excel workbook.

The script intentionally avoids third-party packages so it can run on a fresh
Mac with only Python installed. It copies an existing tracker as a template,
generates config files, and builds a `data.js` snapshot from the workbook.
"""

from __future__ import annotations

import argparse
import copy
import datetime as dt
import html
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Optional
from xml.etree import ElementTree as ET


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEMPLATE = REPO_ROOT / "tools" / "taozhumiao-progress"
NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a progress tracker under tools/<tool-name>/ from an .xlsx file."
    )
    parser.add_argument("--xlsx", required=True, help="Source .xlsx path")
    parser.add_argument("--tool-name", required=True, help="Folder name under tools/, e.g. taichung-progress")
    parser.add_argument("--project-name", required=True, help="Display project name")
    parser.add_argument("--source-url", default="", help="Source Drive/Sheet URL stored in data.js")
    parser.add_argument("--sheet-url", default="", help="Live Google Sheet URL for config.js")
    parser.add_argument("--api-url", default="", help="Apps Script Web App URL for config.js")
    parser.add_argument("--template", default=str(DEFAULT_TEMPLATE), help="Template tracker folder")
    parser.add_argument("--output-root", default=str(REPO_ROOT / "tools"), help="Output root folder")
    parser.add_argument("--force", action="store_true", help="Overwrite existing output folder")
    parser.add_argument(
        "--namespace",
        default="",
        help="JS global namespace prefix. Defaults to TOOL_NAME uppercased and sanitized.",
    )
    return parser.parse_args()


def cell_to_indexes(cell_ref: str) -> tuple[int, int]:
    match = re.match(r"([A-Z]+)(\d+)", cell_ref or "")
    if not match:
        return 0, 0
    col_letters, row_number = match.groups()
    col = 0
    for char in col_letters:
        col = col * 26 + ord(char) - ord("A") + 1
    return int(row_number) - 1, col - 1


def column_letter(index: int) -> str:
    index += 1
    letters = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        letters = chr(65 + remainder) + letters
    return letters


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    strings: list[str] = []
    for si in root.findall(f"{{{NS_MAIN}}}si"):
        parts = [node.text or "" for node in si.findall(f".//{{{NS_MAIN}}}t")]
        strings.append("".join(parts))
    return strings


def read_workbook_sheets(zf: zipfile.ZipFile) -> list[dict[str, str]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rid_to_target: dict[str, str] = {}
    for rel in rels.findall(f"{{{NS_PACKAGE_REL}}}Relationship"):
        target = rel.attrib.get("Target", "")
        rid_to_target[rel.attrib.get("Id", "")] = target if target.startswith("xl/") else f"xl/{target}"

    sheets = []
    for sheet in workbook.findall(f".//{{{NS_MAIN}}}sheet"):
        rid = sheet.attrib.get(f"{{{NS_REL}}}id", "")
        sheets.append(
            {
                "name": sheet.attrib.get("name", "未命名工作表"),
                "state": sheet.attrib.get("state", "visible"),
                "path": rid_to_target.get(rid, ""),
            }
        )
    return sheets


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t", "")
    if cell_type == "inlineStr":
        parts = [node.text or "" for node in cell.findall(f".//{{{NS_MAIN}}}t")]
        return "".join(parts)
    value_node = cell.find(f"{{{NS_MAIN}}}v")
    if value_node is None or value_node.text is None:
        return ""
    raw = value_node.text
    if cell_type == "s":
        try:
            return shared_strings[int(raw)]
        except (ValueError, IndexError):
            return raw
    if cell_type == "b":
        return "TRUE" if raw == "1" else "FALSE"
    return raw


def trim_row(row: list[str]) -> list[str]:
    while row and row[-1] == "":
        row.pop()
    return row


def read_sheet_rows(zf: zipfile.ZipFile, path: str, shared_strings: list[str]) -> list[list[str]]:
    if not path:
        return []
    root = ET.fromstring(zf.read(path))
    rows: list[list[str]] = []
    for row_node in root.findall(f".//{{{NS_MAIN}}}row"):
        row_values: list[str] = []
        for cell in row_node.findall(f"{{{NS_MAIN}}}c"):
            _, col_index = cell_to_indexes(cell.attrib.get("r", ""))
            while len(row_values) <= col_index:
                row_values.append("")
            row_values[col_index] = cell_text(cell, shared_strings)
        rows.append(trim_row(row_values))
    return rows


def read_xlsx(path: Path) -> list[dict[str, object]]:
    with zipfile.ZipFile(path) as zf:
        shared_strings = read_shared_strings(zf)
        sheets = []
        for sheet_meta in read_workbook_sheets(zf):
            rows = read_sheet_rows(zf, sheet_meta["path"], shared_strings)
            sheets.append(
                {
                    "name": sheet_meta["name"],
                    "hidden": sheet_meta.get("state") != "visible",
                    "rows": rows,
                }
            )
        return sheets


def normalize_value(value: object) -> str:
    text = str(value or "").strip()
    if re.match(r"^-?\d+\.0$", text):
        return text[:-2]
    return text


def is_summary_label(value: str) -> bool:
    return normalize_value(value) in {"合計", "總計", "小計"}


def normalize_status(value: str) -> str:
    text = normalize_value(value)
    if "■" in text and "是" in text:
        return "已完成"
    if "已完成" in text:
        return "已完成"
    if "未完成" in text:
        return "未完成"
    if "進行中" in text:
        return "進行中"
    return text or "未確認"


def nonempty_count(row: list[str]) -> int:
    return sum(1 for cell in row if normalize_value(cell))


def detect_header_row(rows: list[list[str]]) -> int:
    header_keywords = {"工作細項", "工作進度", "是否完成", "費用", "負責同仁", "工作項目"}
    for index, row in enumerate(rows):
        values = {normalize_value(cell).replace("\n", "") for cell in row}
        if len(values & header_keywords) >= 2:
            return index
    for index, row in enumerate(rows):
        if nonempty_count(row) >= 3:
            return index
    return 0


def pad(row: list[str], size: int) -> list[str]:
    return row + [""] * max(0, size - len(row))


def row_object(headers: list[str], row: list[str]) -> dict[str, str]:
    return {header: row[index] if index < len(row) else "" for index, header in enumerate(headers) if header}


def find_total_sheet(sheets: list[dict[str, object]]) -> Optional[dict[str, object]]:
    for sheet in sheets:
        name = str(sheet["name"])
        if "總" in name and ("工項" in name or "追蹤" in name):
            return sheet
    return sheets[0] if sheets else None


def find_column(headers: list[str], keywords: list[str]) -> int:
    normalized = [header.replace("\n", "") for header in headers]
    for keyword in keywords:
        for index, header in enumerate(normalized):
            if keyword in header:
                return index
    return -1


def build_items(sheets: list[dict[str, object]]) -> list[dict[str, str]]:
    total_sheet = find_total_sheet(sheets)
    if not total_sheet:
        return []
    rows = copy.deepcopy(total_sheet["rows"])  # type: ignore[index]
    header_index = detect_header_row(rows)
    headers = rows[header_index] if header_index < len(rows) else []
    name_col = find_column(headers, ["工作項目", "工項", "項目"])
    owner_col = find_column(headers, ["主責", "負責"])
    progress_col = find_column(headers, ["現況", "工作進度", "進度"])
    budget_col = find_column(headers, ["核定", "經費", "額度"])
    period_col = find_column(headers, ["時程", "期間"])
    items: list[dict[str, str]] = []

    for row in rows[header_index + 1 :]:
        if nonempty_count(row) < 2:
            continue
        name = row[name_col] if name_col >= 0 and name_col < len(row) else ""
        if not name:
            name = next((cell for cell in row if normalize_value(cell)), "")
        if not name:
            continue
        if is_summary_label(name):
            continue
        serial = len(items) + 1
        items.append(
            {
                "itemId": f"ITEM{serial:03d}",
                "itemName": normalize_value(name),
                "performance": "",
                "budget": normalize_value(row[budget_col]) if budget_col >= 0 and budget_col < len(row) else "",
                "availableBudget": "",
                "actualExpense": "",
                "progressRatio": normalize_value(row[progress_col]) if progress_col >= 0 and progress_col < len(row) else "",
                "owner": normalize_value(row[owner_col]) if owner_col >= 0 and owner_col < len(row) else "",
                "coOwner": "",
                "period": normalize_value(row[period_col]) if period_col >= 0 and period_col < len(row) else "",
                "schedule": "",
                "currentStatus": normalize_value(row[progress_col]) if progress_col >= 0 and progress_col < len(row) else "",
                "expenseNote": "",
            }
        )

    if items:
        return items

    for sheet in sheets:
        name = normalize_value(sheet["name"])
        if name:
            serial = len(items) + 1
            items.append({"itemId": f"ITEM{serial:03d}", "itemName": name, "owner": "", "coOwner": ""})
    return items


def build_tasks(sheets: list[dict[str, object]], items: list[dict[str, str]]) -> list[dict[str, str]]:
    item_by_name = {item.get("itemName", ""): item.get("itemId", "") for item in items}
    tasks: list[dict[str, str]] = []
    for sheet in sheets:
        rows = copy.deepcopy(sheet["rows"])  # type: ignore[index]
        sheet_name = str(sheet["name"])
        if "總" in sheet_name and ("工項" in sheet_name or "追蹤" in sheet_name):
            continue
        header_index = detect_header_row(rows)
        headers = rows[header_index] if header_index < len(rows) else []
        detail_col = find_column(headers, ["工作細項", "細項", "工作內容"])
        progress_col = find_column(headers, ["工作進度", "進度"])
        month_col = find_column(headers, ["執行月份", "月份"])
        owner_col = find_column(headers, ["負責同仁", "負責", "主責"])
        due_col = find_column(headers, ["預定完成日期", "完成日期", "期限"])
        status_col = find_column(headers, ["是否完成", "完成"])
        expense_col = find_column(headers, ["費用", "金額"])
        note_col = find_column(headers, ["備註"])
        item_id = item_by_name.get(sheet_name, "")

        for row in rows[header_index + 1 :]:
            if nonempty_count(row) < 2:
                continue
            task_name = row[detail_col] if detail_col >= 0 and detail_col < len(row) else ""
            progress = row[progress_col] if progress_col >= 0 and progress_col < len(row) else ""
            if is_summary_label(task_name) or is_summary_label(progress):
                continue
            if not task_name and not progress:
                continue
            serial = len(tasks) + 1
            status = row[status_col] if status_col >= 0 and status_col < len(row) else ""
            tasks.append(
                {
                    "taskId": f"TASK{serial:03d}",
                    "itemId": item_id,
                    "sourceSheet": sheet_name,
                    "itemName": sheet_name,
                    "taskName": normalize_value(task_name) or f"{sheet_name} 第{header_index + len(tasks) + 2}列",
                    "month": normalize_value(row[month_col]) if month_col >= 0 and month_col < len(row) else "",
                    "progress": normalize_value(progress),
                    "budget": "",
                    "owner": normalize_value(row[owner_col]) if owner_col >= 0 and owner_col < len(row) else "",
                    "dueDate": normalize_value(row[due_col]) if due_col >= 0 and due_col < len(row) else "",
                    "status": normalize_status(status),
                    "expense": normalize_value(row[expense_col]) if expense_col >= 0 and expense_col < len(row) else "",
                    "expenseDetail": "",
                    "note": normalize_value(row[note_col]) if note_col >= 0 and note_col < len(row) else "",
                }
            )
    return tasks


def build_original_sheets(sheets: list[dict[str, object]]) -> list[dict[str, object]]:
    output = []
    for sheet in sheets:
        rows: list[list[str]] = copy.deepcopy(sheet["rows"])  # type: ignore[index]
        header_index = detect_header_row(rows)
        max_column = max((len(row) for row in rows), default=0)
        output_rows = []
        for row_number, row in enumerate(rows, start=1):
            if nonempty_count(row) == 0:
                continue
            output_rows.append({"rowNumber": row_number, "values": pad(row, max_column)})
        output.append(
            {
                "name": sheet["name"],
                "hidden": sheet.get("hidden", False),
                "headerRow": header_index + 1,
                "maxColumn": max_column,
                "rows": output_rows,
            }
        )
    return output


def js_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def namespace_from_tool(tool_name: str, explicit: str) -> str:
    namespace = explicit or re.sub(r"[^A-Za-z0-9]+", "_", tool_name).strip("_").upper()
    if not namespace:
        raise ValueError("Cannot derive namespace from tool name")
    if not re.match(r"^[A-Z][A-Z0-9_]*$", namespace):
        raise ValueError("Namespace must start with a letter and contain only letters, numbers, or underscores")
    return namespace


def replace_namespace(path: Path, old_upper: str, new_upper: str, old_lower: str, new_lower: str) -> None:
    text = path.read_text(encoding="utf-8")
    text = text.replace(old_upper, new_upper).replace(old_lower, new_lower)
    path.write_text(text, encoding="utf-8")


def extract_spreadsheet_id(sheet_url: str) -> str:
    if not sheet_url:
        return "PUT_GOOGLE_SHEET_ID_HERE"
    match = re.search(r"/spreadsheets/d/([^/#?]+)", sheet_url)
    if match:
        return match.group(1)
    if re.match(r"^[A-Za-z0-9_-]{20,}$", sheet_url):
        return sheet_url
    return "PUT_GOOGLE_SHEET_ID_HERE"


def customize_template_text(destination: Path, project_name: str, sheet_url: str) -> None:
    index_path = destination / "index.html"
    if index_path.exists():
        text = index_path.read_text(encoding="utf-8")
        escaped = html.escape(project_name)
        text = re.sub(r"<title>.*?</title>", f"<title>{escaped}進度填報</title>", text, count=1, flags=re.S)
        text = re.sub(r'<p class="eyebrow">.*?</p>', f'<p class="eyebrow">{escaped}</p>', text, count=1, flags=re.S)
        index_path.write_text(text, encoding="utf-8")

    code_path = destination / "apps-script" / "Code.gs"
    if code_path.exists():
        spreadsheet_id = extract_spreadsheet_id(sheet_url)
        text = code_path.read_text(encoding="utf-8")
        text = re.sub(
            r'const SPREADSHEET_ID = "[^"]*";',
            f'const SPREADSHEET_ID = "{spreadsheet_id}";',
            text,
            count=1,
        )
        code_path.write_text(text, encoding="utf-8")


def copy_template(template: Path, destination: Path, namespace: str, force: bool) -> None:
    if destination.exists():
        if not force:
            raise FileExistsError(f"{destination} already exists. Use --force to overwrite.")
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    for item in template.iterdir():
        if item.name in {"data.js", "config.js"}:
            continue
        if item.name == "apps-script":
            shutil.copytree(item, destination / item.name, ignore=shutil.ignore_patterns(".clasp.json"))
        elif item.is_dir():
            shutil.copytree(item, destination / item.name)
        else:
            shutil.copy2(item, destination / item.name)

    old_upper = "TAOZHUMIAO" if "TAOZHUMIAO" in (destination / "app.js").read_text(encoding="utf-8") else "YUNJIANAN"
    old_lower = old_upper.lower()
    new_lower = namespace.lower()
    for file_path in destination.rglob("*"):
        if file_path.is_file() and file_path.suffix in {".js", ".html", ".css", ".md", ".json", ".gs"}:
            replace_namespace(file_path, old_upper, namespace, old_lower, new_lower)


def write_config(destination: Path, namespace: str, api_url: str, sheet_url: str, project_name: str) -> None:
    content = (
        f"window.{namespace}_CONFIG = {{\n"
        f"  apiUrl: {js_string(api_url)},\n"
        f"  sheetUrl: {js_string(sheet_url)},\n"
        f"  projectName: {js_string(project_name)},\n"
        "};\n"
    )
    (destination / "config.js").write_text(content, encoding="utf-8")
    (destination / "config.example.js").write_text(content, encoding="utf-8")


def write_data(destination: Path, namespace: str, data: dict[str, object]) -> None:
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    (destination / "data.js").write_text(f"window.{namespace}_DATA = {payload};\n", encoding="utf-8")


def write_readme(destination: Path, tool_name: str, project_name: str, xlsx: Path, data: dict[str, object]) -> None:
    url = f"https://junghan0711-dot.github.io/new-project/tools/{tool_name}/"
    readme = f"""# {project_name}進度填報網頁

這個工具設計給 GitHub Pages 靜態託管使用，前端網址會類似：

`{url}`

## 來源資料

`{xlsx}`

`data.js` 已由 Excel 產生快照，包含 {len(data["items"])} 筆工項、{len(data["tasks"])} 筆任務明細與 {len(data["sheets"])} 張原始工作表。

## 後續部署

1. 若要接 Google Sheet 即時寫回，先將 Excel 匯入為原生 Google Sheet。
2. 執行 `tools/scripts/deploy-apps-script.sh {destination}` 部署 Apps Script。
3. 執行 `tools/scripts/check-progress-tracker.py {destination}` 做上線前檢查。
4. commit 並 push 到 GitHub，GitHub Pages 會自動更新。
"""
    (destination / "README.md").write_text(readme, encoding="utf-8")


def main() -> int:
    args = parse_args()
    xlsx = Path(args.xlsx).expanduser().resolve()
    template = Path(args.template).expanduser().resolve()
    output_root = Path(args.output_root).expanduser().resolve()
    tool_name = args.tool_name.strip().strip("/")
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", tool_name):
        print("ERROR: --tool-name must be lowercase letters, numbers, and hyphens.", file=sys.stderr)
        return 2
    if not xlsx.exists():
        print(f"ERROR: source workbook not found: {xlsx}", file=sys.stderr)
        return 2
    if not template.exists():
        print(f"ERROR: template folder not found: {template}", file=sys.stderr)
        return 2

    namespace = namespace_from_tool(tool_name, args.namespace)
    destination = output_root / tool_name
    sheets = read_xlsx(xlsx)
    items = build_items(sheets)
    tasks = build_tasks(sheets, items)
    data = {
        "generatedAt": dt.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "sourceUrl": args.source_url,
        "items": items,
        "tasks": tasks,
        "updates": [],
        "expenses": [],
        "cases": [],
        "caseUpdates": [],
        "sheets": build_original_sheets(sheets),
    }

    copy_template(template, destination, namespace, args.force)
    customize_template_text(destination, args.project_name, args.sheet_url)
    write_config(destination, namespace, args.api_url, args.sheet_url, args.project_name)
    write_data(destination, namespace, data)
    write_readme(destination, tool_name, args.project_name, xlsx, data)

    print(f"Created {destination}")
    print(f"Namespace: {namespace}")
    print(f"Items: {len(items)}")
    print(f"Tasks: {len(tasks)}")
    print(f"Sheets: {len(data['sheets'])}")
    print(f"URL: https://junghan0711-dot.github.io/new-project/tools/{tool_name}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
