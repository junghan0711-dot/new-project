#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

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

tools/scripts/check-progress-tracker.py \
  tools/yunjianan-progress \
  --url "https://junghan0711-dot.github.io/new-project/tools/yunjianan-progress/"

tools/scripts/check-progress-tracker.py \
  tools/taozhumiao-progress \
  --url "https://junghan0711-dot.github.io/new-project/tools/taozhumiao-progress/"

check_apps_script_only tools/company-dashboard

echo
echo "All web tool checks completed."
