#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  tools/scripts/deploy-registered-tool.sh <project-id> [deploy-apps-script options]

Examples:
  tools/scripts/deploy-registered-tool.sh yunjianan --description "Update case list"
  tools/scripts/deploy-registered-tool.sh company-dashboard --description "Update dashboard"

This script reads tools/project-registry.json, finds the tool directory and
Apps Script deployment id, then delegates to deploy-apps-script.sh.
EOF
}

if [[ $# -lt 1 || "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit $([[ $# -lt 1 ]] && echo 2 || echo 0)
fi

project_id="$1"
shift

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

REGISTRY_FILE="tools/project-registry.json"
if [[ ! -f "$REGISTRY_FILE" ]]; then
  echo "ERROR: Registry not found: $REGISTRY_FILE" >&2
  exit 2
fi

project_info="$(python3 - "$REGISTRY_FILE" "$project_id" <<'PY'
import json
import sys

registry_path, project_id = sys.argv[1], sys.argv[2]
with open(registry_path, encoding="utf-8") as handle:
    registry = json.load(handle)

for project in registry.get("projects", []):
    if project.get("id") == project_id:
        apps_script = project.get("appsScript") or {}
        print("\t".join([
            project.get("toolDir", ""),
            apps_script.get("deploymentId", ""),
        ]))
        break
else:
    raise SystemExit(f"Project not found in registry: {project_id}")
PY
)"

IFS=$'\t' read -r tool_dir deployment_id <<<"$project_info"
if [[ -z "$tool_dir" || -z "$deployment_id" ]]; then
  echo "ERROR: Registry entry for $project_id must include toolDir and appsScript.deploymentId" >&2
  exit 2
fi

tools/scripts/deploy-apps-script.sh "$tool_dir" --deployment-id "$deployment_id" "$@"
