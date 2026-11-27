#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# HaiHire Local Staging Build & Launch Script
# ==============================================================================
# Builds local api/web Docker images from workspace Dockerfiles, runs automatic
# Prisma migrations (`migrate`), starts the stack on port 8081, and verifies
# Caddy gateway + API health.
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.staging.yml"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env.staging}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: Environment file not found at ${ENV_FILE}" >&2
  echo "Copy ${ROOT_DIR}/.env.staging.example to ${ENV_FILE} and fill in secrets first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

GATEWAY_PORT="${GATEWAY_PORT:-8081}"
GATEWAY_URL="http://127.0.0.1:${GATEWAY_PORT}"

echo "==> Building and starting local staging stack (migrate -> api -> web -> gateway on :${GATEWAY_PORT})..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --build --remove-orphans

echo "==> Verifying Caddy gateway & API health at ${GATEWAY_URL}..."
for attempt in $(seq 1 30); do
  if curl -fsS "${GATEWAY_URL}/gateway-health" >/dev/null 2>&1 \
    && curl -fsS "${GATEWAY_URL}/api/health" >/dev/null 2>&1; then
    echo "SUCCESS: Local staging stack is healthy at ${GATEWAY_URL}"
    docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
    exit 0
  fi
  sleep 2
done

echo "ERROR: Healthcheck did not pass within 60s." >&2
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
exit 1
