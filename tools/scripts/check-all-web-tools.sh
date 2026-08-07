#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
REGISTRY_FILE="tools/project-registry.json"

node_bin="$(command -v node || true)"
if [[ -z "$node_bin" && -x "/Users/junghanchiu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node" ]]; then
  node_bin="/Users/junghanchiu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi

check_apps_script_only() {
  local tool_dir="$1"
  local code_file="$tool_dir/apps-script/Code.gs"
  local manifest_file="$tool_dir/apps-script/appsscript.json"
  local temp_file
  temp_file="$(mktemp /tmp/apps-script-check.XXXXXX.js)"
  cp "$code_file" "$temp_file"
  if [[ -n "$node_bin" ]]; then
    "$node_bin" --check "$temp_file"
  else
    echo "WARN Node.js not found; skipped $code_file syntax check"
  fi
  rm -f "$temp_file"
  python3 -m json.tool "$manifest_file" >/dev/null
  echo "OK   $tool_dir Apps Script syntax and manifest"
}

check_drive_dashboard() {
  local tool_dir="$1"
  local page_url="$2"
  local web_app_url="$3"
  local code_file="$tool_dir/apps-script/Code.gs"
  local temp_file
  temp_file="$(mktemp /tmp/drive-dashboard-check.XXXXXX.js)"
  cp "$code_file" "$temp_file"
  "$node_bin" --check "$temp_file"
  rm -f "$temp_file"
  "$node_bin" --check "$tool_dir/app.js"
  python3 -m json.tool "$tool_dir/apps-script/appsscript.json" >/dev/null
  curl -fsSL --max-time 20 "$page_url" >/dev/null
  curl -fsSL --max-time 25 "${web_app_url}?action=health&callback=cb" | grep -q '"ok":true'
  echo "OK   $tool_dir page, JavaScript, manifest and API health"
}

python3 -m json.tool "$REGISTRY_FILE" >/dev/null
echo "OK   $REGISTRY_FILE JSON syntax"

while IFS=$'\t' read -r project_id project_type tool_dir page_url web_app_url; do
  [[ -n "$project_id" ]] || continue
  echo
  echo "== $project_id =="
  case "$project_type" in
    progress-tracker)
      tools/scripts/check-progress-tracker.py "$tool_dir" --url "$page_url"
      ;;
    apps-script-dashboard)
      check_apps_script_only "$tool_dir"
      ;;
    drive-dashboard)
      check_drive_dashboard "$tool_dir" "$page_url" "$web_app_url"
      ;;
    *)
      echo "WARN Unsupported project type for $project_id: $project_type"
      ;;
  esac
done < <(python3 - "$REGISTRY_FILE" <<'PY'
import json
import sys

with open(sys.argv[1], encoding="utf-8") as handle:
    registry = json.load(handle)

for project in registry.get("projects", []):
    if project.get("status") != "active":
        continue
    print("\t".join([
        project.get("id", ""),
        project.get("type", ""),
        project.get("toolDir", ""),
        project.get("pageUrl", ""),
        project.get("appsScript", {}).get("webAppUrl", ""),
    ]))
PY
)

echo
echo "All web tool checks completed."
