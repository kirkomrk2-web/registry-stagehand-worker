#!/usr/bin/env bash
set -euo pipefail

# Simple tester for Supabase Edge Functions
# Usage:
#   export SUPABASE_ANON_KEY=...  # from your project settings
#   bash supabase/tests/test_edge_functions.sh registry_check
#   bash supabase/tests/test_edge_functions.sh users_pending_worker
# Optional env:
#   BASE_URL=https://<project>.supabase.co/functions/v1
#   FULL_NAME="Иван Иванов"  EMAIL="ivan.test@example.com"

FUNC=${1:-registry_check}
BASE_URL=${BASE_URL:-"https://ansiaiuaygcfztabtknl.supabase.co/functions/v1"}
ANON_KEY=${SUPABASE_ANON_KEY:-}
ADMIN_PUSH_KEY=${ADMIN_PUSH_KEY:-}
FULL_NAME=${FULL_NAME:-"Иван Иванов"}
EMAIL=${EMAIL:-"ivan.test+$(date +%s)@example.com"}

if [[ -z "${ANON_KEY}" ]]; then
  echo "[!] Please export SUPABASE_ANON_KEY=<your_anon_key> first"
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "[!] jq is required. Install jq and retry."
  exit 1
fi

case "${FUNC}" in
  registry_check)
    URL="${BASE_URL}/registry_check"
    PAYLOAD=$(jq -n --arg fn "${FULL_NAME}" --arg em "${EMAIL}" '{full_name:$fn, email:$em}')
    ;;
  users_pending_worker)
    URL="${BASE_URL}/users_pending_worker"
    # If the function auto-picks a pending user, you can omit the row.
    PAYLOAD=$(jq -n --arg fn "${FULL_NAME}" --arg em "${EMAIL}" '{row:{full_name:$fn, email:$em, status:"pending"}}')
    ;;
  owners_push_slim)
    URL="${BASE_URL}/owners_push_slim"
    if [[ -z "${ADMIN_PUSH_KEY}" ]]; then
      echo "[!] Please export ADMIN_PUSH_KEY=<admin_push_key> for owners_push_slim"
      exit 1
    fi
    # Optional inputs for building one slim company
    EIK=${EIK:-"200000000"}
    BUSINESS_NAME_EN=${BUSINESS_NAME_EN:-"SAMPLE LTD"}
    VAT=${VAT:-"BG${EIK}"}
    ENTITY_TYPE=${ENTITY_TYPE:-"EOOD"}
    CITY_EN=${CITY_EN:-"Sofia"}
    REGION_EN=${REGION_EN:-"Sofia"}
    COUNTRY_EN=${COUNTRY_EN:-"Bulgaria"}
    PAYLOAD=$(jq -n \
      --arg fn "${FULL_NAME}" \
      --arg bn "${BUSINESS_NAME_EN}" \
      --arg eik "${EIK}" \
      --arg vat "${VAT}" \
      --arg et "${ENTITY_TYPE}" \
      --arg city "${CITY_EN}" \
      --arg region "${REGION_EN}" \
      --arg country "${COUNTRY_EN}" \
      '{full_name:$fn, companies:[{id:("test-" + (now|tostring)), business_name_en:$bn, eik:$eik, vat:$vat, entity_type:$et, city_en:$city, region_en:$region, country_en:$country}]}'
    )
    ;;
  *)
    echo "Usage: $0 [registry_check|users_pending_worker|owners_push_slim]"
    exit 1
    ;;
esac

echo "[i] POST ${URL}"
echo "[i] FULL_NAME='${FULL_NAME}' EMAIL='${EMAIL}'"

# -i to show status line/headers for quick debug
# Build headers
HDRS=(-H "Content-Type: application/json")
if [[ -n "${ANON_KEY}" ]]; then HDRS+=( -H "Authorization: Bearer ${ANON_KEY}" ); fi
if [[ "${FUNC}" == "owners_push_slim" ]]; then HDRS+=( -H "x-admin-key: ${ADMIN_PUSH_KEY}" ); fi

curl -sS -i -X POST "${URL}" \
  "${HDRS[@]}" \
  --data "${PAYLOAD}" || {
  code=$?
  echo "\n[!] curl exited with code ${code}" >&2
  exit ${code}
}
