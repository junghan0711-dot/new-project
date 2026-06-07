#!/usr/bin/env python3
"""Create a new project progress website from a small JSON config.

This wraps create-progress-tracker.py so a new government project can be
created from one project config, then optionally registered in the company
dashboard.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
TOOLS_ROOT = REPO_ROOT / "tools"
CREATE_TRACKER = REPO_ROOT / "tools" / "scripts" / "create-progress-tracker.py"
COMPANY_DASHBOARD_CODE = REPO_ROOT / "tools" / "company-dashboard" / "apps-script" / "Code.gs"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a new tools/<project-progress>/ website from project-template JSON."
    )
    parser.add_argument("--config", required=True, help="Path to project JSON config")
    parser.add_argument("--dry-run", action="store_true", help="Print planned actions without writing files")
    return parser.parse_args()


def load_config(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError("Config must be a JSON object")
    return data


def required_text(config: dict[str, Any], key: str) -> str:
    value = str(config.get(key, "")).strip()
    if not value:
        raise ValueError(f"Missing required config field: {key}")
    return value


def optional_text(config: dict[str, Any], key: str) -> str:
    return str(config.get(key, "")).strip()


def bool_value(config: dict[str, Any], key: str, default: bool = False) -> bool:
    value = config.get(key, default)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "是"}
    return bool(value)


def validate_tool_name(tool_name: str) -> None:
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", tool_name):
        raise ValueError("toolName must be lowercase letters, numbers, and hyphens")


def extract_spreadsheet_id(value: str) -> str:
    match = re.search(r"/spreadsheets/d/([^/#?]+)", value)
    if match:
        return match.group(1)
    if re.match(r"^[A-Za-z0-9_-]{20,}$", value):
        return value
    return ""


def github_pages_url(tool_name: str) -> str:
    return f"https://junghan0711-dot.github.io/new-project/tools/{tool_name}/"


def run_create_tracker(config: dict[str, Any], config_path: Path, dry_run: bool) -> Path:
    tool_name = required_text(config, "toolName")
    project_name = required_text(config, "projectName")
    xlsx = Path(required_text(config, "xlsx")).expanduser()
    template = optional_text(config, "template") or "tools/taozhumiao-progress"
    template_path = (REPO_ROOT / template).resolve() if not Path(template).is_absolute() else Path(template).resolve()
    destination = TOOLS_ROOT / tool_name
    validate_tool_name(tool_name)

    command = [
        sys.executable,
        str(CREATE_TRACKER),
        "--xlsx",
        str(xlsx),
        "--tool-name",
        tool_name,
        "--project-name",
        project_name,
        "--source-url",
        optional_text(config, "sourceUrl"),
        "--sheet-url",
        optional_text(config, "spreadsheetUrl"),
        "--api-url",
        optional_text(config, "apiUrl"),
        "--template",
        str(template_path),
    ]
    if bool_value(config, "force"):
        command.append("--force")

    if dry_run:
        print("Would run:")
        print(" ".join(command))
        print(f"Would create: {destination}")
        return destination

    if not xlsx.exists():
        raise FileNotFoundError(f"Source xlsx not found: {xlsx}")
    subprocess.run(command, cwd=REPO_ROOT, check=True)
    write_setup_checklist(destination, config_path, config)
    return destination


def project_entry(config: dict[str, Any]) -> str:
    tool_name = required_text(config, "toolName")
    project_name = required_text(config, "projectName")
    office = required_text(config, "office")
    spreadsheet_url = required_text(config, "spreadsheetUrl")
    spreadsheet_id = extract_spreadsheet_id(spreadsheet_url)
    if not spreadsheet_id:
        raise ValueError("spreadsheetUrl must be a Google Sheet URL or spreadsheet ID when addToDashboard is true")
    return (
        "  {\n"
        f'    id: "{tool_name.replace("-progress", "")}",\n'
        f'    name: "{project_name}",\n'
        f'    office: "{office}",\n'
        f'    spreadsheetId: "{spreadsheet_id}",\n'
        f'    pageUrl: "{github_pages_url(tool_name)}",\n'
        "  },\n"
    )


def add_to_dashboard(config: dict[str, Any], dry_run: bool) -> None:
    tool_name = required_text(config, "toolName")
    if not bool_value(config, "addToDashboard"):
        return
    entry = project_entry(config)
    if dry_run:
        print("Would add to company dashboard PROJECTS:")
        print(entry)
        return
    text = COMPANY_DASHBOARD_CODE.read_text(encoding="utf-8")
    if f'pageUrl: "{github_pages_url(tool_name)}"' in text:
        print("Company dashboard already contains this project; skipped dashboard update.")
        return
    match = re.search(r"(const PROJECTS = \[[\s\S]*?\n)(\];)", text)
    if not match:
        raise ValueError("Cannot locate PROJECTS array in company dashboard Code.gs")
    updated = text[: match.start(2)] + entry + text[match.start(2) :]
    COMPANY_DASHBOARD_CODE.write_text(updated, encoding="utf-8")
    print("Updated company dashboard PROJECTS.")


def write_setup_checklist(destination: Path, config_path: Path, config: dict[str, Any]) -> None:
    tool_name = required_text(config, "toolName")
    project_name = required_text(config, "projectName")
    checklist = f"""# {project_name} 上線檢查清單

由 `{config_path}` 產生。

## 已產生

- 網頁資料夾：`tools/{tool_name}/`
- GitHub Pages 預計網址：`{github_pages_url(tool_name)}`
- Google Sheet：`{optional_text(config, "spreadsheetUrl") or "尚未填入"}`
- Apps Script API：`{optional_text(config, "apiUrl") or "尚未部署"}`

## 下一步

1. 確認 Excel 已轉成原生 Google Sheet，且欄位與既有專案一致。
2. 執行檢查：`tools/scripts/check-progress-tracker.py tools/{tool_name}`。
3. 部署 Apps Script：
   `tools/scripts/deploy-apps-script.sh tools/{tool_name} --title "{project_name}進度填報 API" --update-config`
4. 若已加入公司總控台，部署總控台：
   `tools/scripts/deploy-apps-script.sh tools/company-dashboard --deployment-id AKfycbyknQkwIo9PXksPGtCCCDkO8C-d2Vje4ZkBgWGU2gNo_dQU5o7hTlYtja1kVoXzfbLP --description "Add {project_name}"`
5. commit 並 push，讓 GitHub Pages 更新。
6. 用網頁新增一筆測試案件、補一筆進度、解除一筆列管，確認 Google Sheet 讀寫正常。
"""
    (destination / "SETUP_CHECKLIST.md").write_text(checklist, encoding="utf-8")


def main() -> int:
    args = parse_args()
    config_path = Path(args.config).expanduser().resolve()
    config = load_config(config_path)
    destination = run_create_tracker(config, config_path, args.dry_run)
    add_to_dashboard(config, args.dry_run)
    if not args.dry_run:
        print(f"Created project tool: {destination}")
        print(f"Next: tools/scripts/check-progress-tracker.py {destination.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
