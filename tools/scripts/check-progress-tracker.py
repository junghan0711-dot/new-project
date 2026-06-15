#!/usr/bin/env python3
"""Preflight checks for a progress-tracker web tool."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check a tools/<progress-tracker>/ folder before publishing.")
    parser.add_argument("tool_dir", help="Tracker folder, e.g. tools/taozhumiao-progress")
    parser.add_argument("--url", default="", help="Optional deployed GitHub Pages URL to check")
    return parser.parse_args()


class Reporter:
    def __init__(self) -> None:
        self.failures: list[str] = []
        self.warnings: list[str] = []

    def ok(self, message: str) -> None:
        print(f"OK   {message}")

    def warn(self, message: str) -> None:
        self.warnings.append(message)
        print(f"WARN {message}")

    def fail(self, message: str) -> None:
        self.failures.append(message)
        print(f"FAIL {message}")


def run(command: list[str], cwd: Path, reporter: Reporter, label: str) -> None:
    result = subprocess.run(command, cwd=cwd, text=True, capture_output=True)
    if result.returncode == 0:
        reporter.ok(label)
    else:
        reporter.fail(label)
        output = (result.stdout + result.stderr).strip()
        if output:
            print(output)


def find_node() -> Optional[str]:
    return shutil.which("node") or "/Users/junghanchiu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_config_value(config: str, key: str) -> str:
    match = re.search(rf'{re.escape(key)}:\s*"([^"]*)"', config)
    return match.group(1) if match else ""


def fetch_text(url: str, reporter: Reporter, label: str, timeout: int = 10) -> str:
    request = urllib.request.Request(url, headers={"Cache-Control": "no-cache"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read(262144).decode("utf-8", errors="ignore")
            if response.status == 200:
                reporter.ok(f"{label} returns 200")
            else:
                reporter.fail(f"{label} returned HTTP {response.status}: {url}")
            return body
    except Exception as error:  # noqa: BLE001 - command-line preflight should report all URL failures
        reporter.fail(f"{label} failed: {error}")
        return ""


def check_required_files(tool_dir: Path, reporter: Reporter) -> None:
    required = [
        "index.html",
        "styles.css",
        "app.js",
        "config.js",
        "config.example.js",
        "data.js",
        "README.md",
        "apps-script/Code.gs",
        "apps-script/appsscript.json",
    ]
    for relative in required:
        path = tool_dir / relative
        if path.exists():
            reporter.ok(f"Found {relative}")
        else:
            reporter.fail(f"Missing {relative}")


def check_js(tool_dir: Path, reporter: Reporter) -> None:
    node = find_node()
    if not node or not Path(node).exists():
        reporter.warn("Node.js not found; skipped JS syntax checks")
        return
    run([node, "--check", str(tool_dir / "app.js")], tool_dir, reporter, "app.js syntax")
    run([node, "--check", str(tool_dir / "data.js")], tool_dir, reporter, "data.js syntax")
    temp = Path("/tmp/progress-tracker-code-check.js")
    temp.write_text(read_text(tool_dir / "apps-script" / "Code.gs"), encoding="utf-8")
    run([node, "--check", str(temp)], tool_dir, reporter, "Apps Script syntax")


def extract_json_from_data(data_js: str) -> Optional[dict[str, object]]:
    match = re.search(r"window\.[A-Z0-9_]+_DATA\s*=\s*(\{.*\});?\s*$", data_js, re.S)
    if not match:
        return None
    return json.loads(match.group(1))


def check_data(tool_dir: Path, reporter: Reporter) -> None:
    try:
        data = extract_json_from_data(read_text(tool_dir / "data.js"))
    except json.JSONDecodeError as error:
        reporter.fail(f"data.js JSON parse failed: {error}")
        return
    if data is None:
        reporter.fail("data.js does not match window.<NAMESPACE>_DATA = {...}")
        return
    for key in ("items", "tasks", "sheets"):
        value = data.get(key)
        if isinstance(value, list) and value:
            reporter.ok(f"data.js has {len(value)} {key}")
        elif isinstance(value, list):
            reporter.warn(f"data.js {key} is empty")
        else:
            reporter.fail(f"data.js missing list: {key}")


def check_config(tool_dir: Path, reporter: Reporter) -> None:
    config = read_text(tool_dir / "config.js")
    sheet_url = extract_config_value(config, "sheetUrl")
    api_url = extract_config_value(config, "apiUrl")
    if sheet_url.startswith("https://docs.google.com/spreadsheets/d/"):
        reporter.ok("config.js has Google Sheet URL")
    else:
        reporter.warn("config.js sheetUrl is blank or not a Google Sheet URL")
    if api_url.startswith("https://script.google.com/macros/s/"):
        reporter.ok("config.js has Apps Script API URL")
    else:
        reporter.warn("config.js apiUrl is blank; page will use snapshot only")
    readme = read_text(tool_dir / "README.md")
    readme_api_urls = sorted(set(re.findall(r"https://script\.google\.com/macros/s/[^)`\s]+/exec", readme)))
    if api_url and readme_api_urls:
        if api_url in readme_api_urls:
            reporter.ok("README Web App URL matches config.js apiUrl")
        else:
            reporter.fail(
                "README Web App URL does not match config.js apiUrl: "
                f"config={api_url}; README={', '.join(readme_api_urls)}"
            )
    if api_url:
        health_url = f"{api_url}?{urlencode({'action': 'health'})}"
        body = fetch_text(health_url, reporter, "Apps Script health")
        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            reporter.fail("Apps Script health did not return JSON")
        else:
            if payload.get("ok") is True:
                reporter.ok("Apps Script health returned ok=true")
            elif body:
                reporter.fail(f"Apps Script health returned unexpected payload: {body[:200]}")


def check_dom_ids(tool_dir: Path, reporter: Reporter) -> None:
    html = read_text(tool_dir / "index.html")
    app = read_text(tool_dir / "app.js")
    ids = set(re.findall(r'id="([^"]+)"', html))
    referenced = set(re.findall(r'\$\("([^"]+)"\)', app))
    missing = sorted(referenced - ids)
    if missing:
        reporter.fail(f"Missing DOM ids referenced by app.js: {', '.join(missing[:20])}")
    else:
        reporter.ok(f"All {len(referenced)} referenced DOM ids exist")


def check_manifest(tool_dir: Path, reporter: Reporter) -> None:
    path = tool_dir / "apps-script" / "appsscript.json"
    try:
        manifest = json.loads(read_text(path))
    except json.JSONDecodeError as error:
        reporter.fail(f"appsscript.json parse failed: {error}")
        return
    webapp = manifest.get("webapp", {})
    if webapp.get("executeAs"):
        reporter.ok(f"manifest executeAs: {webapp.get('executeAs')}")
    else:
        reporter.warn("manifest missing webapp.executeAs")
    if webapp.get("access"):
        reporter.ok(f"manifest access: {webapp.get('access')}")
    else:
        reporter.warn("manifest missing webapp.access")
    scopes = manifest.get("oauthScopes", [])
    if "https://www.googleapis.com/auth/spreadsheets" in scopes:
        reporter.ok("manifest includes spreadsheets scope")
    else:
        reporter.warn("manifest missing spreadsheets scope")


def check_url(url: str, reporter: Reporter) -> None:
    if not url:
        return
    body = fetch_text(url, reporter, f"URL check: {url}")
    if not body:
        return
    if "data.js" in body and "app.js" in body:
        reporter.ok("Deployed page references app.js and data.js")
    else:
        reporter.warn("Deployed page did not include expected script references")


def check_deployed_assets(tool_dir: Path, url: str, reporter: Reporter) -> None:
    if not url:
        return
    local_html = read_text(tool_dir / "index.html")
    deployed_html = fetch_text(url, reporter, "Deployed page asset check")
    if not deployed_html:
        return
    for asset in re.findall(r'(?:script src|link rel="stylesheet" href)="([^"]+)"', local_html):
        if asset in deployed_html:
            reporter.ok(f"Deployed page references current asset: {asset}")
        else:
            reporter.warn(f"Deployed page does not reference current local asset: {asset}")


def main() -> int:
    args = parse_args()
    tool_dir = Path(args.tool_dir).resolve()
    reporter = Reporter()
    if not tool_dir.exists():
        reporter.fail(f"Tool directory not found: {tool_dir}")
        return 1
    check_required_files(tool_dir, reporter)
    if not reporter.failures:
        check_js(tool_dir, reporter)
        check_data(tool_dir, reporter)
        check_config(tool_dir, reporter)
        check_dom_ids(tool_dir, reporter)
        check_manifest(tool_dir, reporter)
        check_url(args.url, reporter)
        check_deployed_assets(tool_dir, args.url, reporter)
    print()
    print(f"Summary: {len(reporter.failures)} failure(s), {len(reporter.warnings)} warning(s)")
    return 1 if reporter.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
