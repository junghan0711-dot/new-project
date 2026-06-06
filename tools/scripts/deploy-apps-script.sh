#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  tools/scripts/deploy-apps-script.sh <tool-dir> [options]

Options:
  --title <title>          Apps Script project title when .clasp.json is absent
  --description <text>     Version/deployment description
  --access <value>         Manifest webapp access: ANYONE or ANYONE_ANONYMOUS
  --deployment-id <id>     Update an existing deployment to keep the same Web App URL
  --update-config          Write the deployed Web App URL into config.js and config.example.js

Example:
  tools/scripts/deploy-apps-script.sh tools/taozhumiao-progress --update-config
  tools/scripts/deploy-apps-script.sh tools/company-dashboard --deployment-id AKfy...
EOF
}

if [[ $# -eq 1 && ( "$1" == "-h" || "$1" == "--help" ) ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 ]]; then
  usage
  exit 2
fi

tool_dir="$1"
shift
title=""
description="Progress tracker web app"
access=""
deployment_id=""
update_config=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --title)
      title="${2:-}"
      shift 2
      ;;
    --description)
      description="${2:-}"
      shift 2
      ;;
    --access)
      access="${2:-}"
      shift 2
      ;;
    --deployment-id)
      deployment_id="${2:-}"
      shift 2
      ;;
    --update-config)
      update_config=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 2
      ;;
  esac
done

script_dir="$tool_dir/apps-script"
if [[ ! -d "$script_dir" ]]; then
  echo "ERROR: Apps Script folder not found: $script_dir" >&2
  exit 2
fi
if [[ ! -f "$script_dir/Code.gs" || ! -f "$script_dir/appsscript.json" ]]; then
  echo "ERROR: Code.gs and appsscript.json are required in $script_dir" >&2
  exit 2
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "ERROR: npx is required to run @google/clasp." >&2
  exit 2
fi

if [[ -n "$access" ]]; then
  python3 - "$script_dir/appsscript.json" "$access" <<'PY'
import json
import sys
path, access = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as handle:
    manifest = json.load(handle)
manifest.setdefault("webapp", {})
manifest["webapp"]["executeAs"] = manifest["webapp"].get("executeAs", "USER_DEPLOYING")
manifest["webapp"]["access"] = access
with open(path, "w", encoding="utf-8") as handle:
    json.dump(manifest, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY
fi

pushd "$script_dir" >/dev/null

if [[ ! -f ".clasp.json" ]]; then
  if [[ -z "$title" ]]; then
    title="$(basename "$tool_dir") API"
  fi
  manifest_backup="$(mktemp)"
  cp appsscript.json "$manifest_backup"
  npx --yes @google/clasp create --type standalone --title "$title" --rootDir .
  cp "$manifest_backup" appsscript.json
  rm -f "$manifest_backup"
fi

npx --yes @google/clasp push --force
version_output="$(npx --yes @google/clasp version "$description")"
echo "$version_output"
version_number="$(printf '%s\n' "$version_output" | sed -n 's/^Created version //p' | tail -1)"
if [[ -z "$version_number" ]]; then
  echo "ERROR: Could not determine created Apps Script version." >&2
  exit 1
fi

if [[ -n "$deployment_id" ]]; then
  deploy_output="$(npx --yes @google/clasp deploy -i "$deployment_id" -V "$version_number" -d "$description")"
else
  deploy_output="$(npx --yes @google/clasp deploy -V "$version_number" -d "$description")"
fi
echo "$deploy_output"
deployed_id="$(printf '%s\n' "$deploy_output" | sed -n 's/^Deployed \([^ ]*\) .*/\1/p' | tail -1)"
if [[ -n "$deployed_id" ]]; then
  deployment_id="$deployed_id"
fi
if [[ -z "$deployment_id" ]]; then
  echo "ERROR: Could not determine deployment id." >&2
  exit 1
fi

web_app_url="https://script.google.com/macros/s/${deployment_id}/exec"
echo "Web App URL: $web_app_url"

popd >/dev/null

if [[ "$update_config" -eq 1 ]]; then
  python3 - "$tool_dir" "$web_app_url" <<'PY'
import re
import sys
from pathlib import Path
tool_dir = Path(sys.argv[1])
url = sys.argv[2]
for name in ("config.js", "config.example.js"):
    path = tool_dir / name
    text = path.read_text(encoding="utf-8")
    text = re.sub(r'apiUrl:\s*"[^"]*"', f'apiUrl: "{url}"', text, count=1)
    path.write_text(text, encoding="utf-8")
PY
  echo "Updated config.js and config.example.js"
fi
