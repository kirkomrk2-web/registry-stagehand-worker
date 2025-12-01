#!/usr/bin/env bash
set -euo pipefail

# Simple watcher: every N seconds call users_pending_worker with empty body
# Requires SUPABASE_ANON_KEY and BASE_URL env vars.
# Usage:
#   export SUPABASE_ANON_KEY=... 
#   export BASE_URL=https://<project-ref>.supabase.co/functions/v1
#   ./pending_watcher.sh 60   # interval seconds (default 60)

INTERVAL=${1:-60}
: "${SUPABASE_ANON_KEY:?SUPABASE_ANON_KEY is required}"
: "${BASE_URL:?BASE_URL is required (e.g. https://ansiaiuaygcfztabtknl.supabase.co/functions/v1)}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Starting pending watcher (every ${INTERVAL}s) -> ${BASE_URL}/users_pending_worker"

while true; do
  TS=$(date '+%Y-%m-%d %H:%M:%S')
  RESP=$(curl -sS -i -X POST "${BASE_URL}/users_pending_worker" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    --data '{}' || true)
  STATUS=$(printf "%s\n" "$RESP" | awk 'NR==1{print $2}')
  BODY=$(printf "%s\n" "$RESP" | sed -n '/^{/,$p')
  log "HTTP ${STATUS} :: ${BODY}"
  sleep "${INTERVAL}"
done
