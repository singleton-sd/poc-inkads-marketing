#!/usr/bin/env bash
# Resolve PUBLIC_POSTKIT_API_BASE_URL for Astro builds.
#
# Priority:
#   1. Explicit override (local/emergency) via PUBLIC_POSTKIT_API_BASE_URL
#   2. Azure App Configuration key app:api:publicBaseUrl (source of truth)
#
# Usage (CI after az login):
#   export PUBLIC_POSTKIT_API_BASE_URL="$(./scripts/resolve-postkit-api-base-url.sh)"
#
# Required for App Config path:
#   POSTKIT_APPCONFIG_NAME  (default: ssd-postkit-appcs-prod-ae)
#   Azure CLI logged in with App Configuration Data Reader on that store
set -euo pipefail

KEY="${POSTKIT_APPCONFIG_PUBLIC_BASE_URL_KEY:-app:api:publicBaseUrl}"
STORE="${POSTKIT_APPCONFIG_NAME:-ssd-postkit-appcs-prod-ae}"

is_https_url() {
  case "${1:-}" in
    https://*) return 0 ;;
    *) return 1 ;;
  esac
}

if [[ -n "${PUBLIC_POSTKIT_API_BASE_URL:-}" ]]; then
  if ! is_https_url "$PUBLIC_POSTKIT_API_BASE_URL"; then
    echo "PUBLIC_POSTKIT_API_BASE_URL override must be an https:// URL" >&2
    exit 1
  fi
  printf '%s\n' "${PUBLIC_POSTKIT_API_BASE_URL%/}"
  exit 0
fi

if ! command -v az >/dev/null 2>&1; then
  echo "az CLI required to read PostKit App Configuration (or set PUBLIC_POSTKIT_API_BASE_URL)" >&2
  exit 1
fi

value="$(
  az appconfig kv show \
    --name "$STORE" \
    --key "$KEY" \
    --auth-mode login \
    --query value \
    -o tsv
)"
value="${value%"${value##*[![:space:]]}"}"
value="${value#"${value%%[![:space:]]*}"}"
value="${value%/}"

if [[ -z "$value" ]]; then
  echo "App Configuration key '$KEY' in store '$STORE' is empty" >&2
  exit 1
fi

if ! is_https_url "$value"; then
  echo "App Configuration key '$KEY' must be an https:// URL (got: $value)" >&2
  exit 1
fi

printf '%s\n' "$value"
