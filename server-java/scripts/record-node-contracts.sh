#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JAVA_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${JAVA_ROOT}/.." && pwd)"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.java.yml"
NODE_PID=""

cleanup() {
  if [[ -n "${NODE_PID}" ]]; then
    kill "${NODE_PID}" 2>/dev/null || true
  fi
  docker compose -f "${COMPOSE_FILE}" down >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker compose -f "${COMPOSE_FILE}" up -d mysql mailpit

for _ in $(seq 1 60); do
  if docker compose -f "${COMPOSE_FILE}" ps mysql | grep -q healthy; then
    break
  fi
  sleep 2
done

docker compose -f "${COMPOSE_FILE}" exec -T mysql \
  mysql --default-character-set=utf8mb4 -uroot -proot \
  -e "DROP DATABASE IF EXISTS njupt_hub; CREATE DATABASE njupt_hub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

docker compose -f "${COMPOSE_FILE}" exec -T mysql \
  mysql --default-character-set=utf8mb4 -uroot -proot njupt_hub \
  < "${JAVA_ROOT}/src/main/resources/db/migration/V1__baseline.sql"

docker compose -f "${COMPOSE_FILE}" exec -T mysql \
  mysql --default-character-set=utf8mb4 -uroot -proot njupt_hub \
  < "${JAVA_ROOT}/src/test/resources/contract/seed/users.sql"

if [[ -f "${JAVA_ROOT}/src/test/resources/contract/seed/resources.sql" ]]; then
  docker compose -f "${COMPOSE_FILE}" exec -T mysql \
    mysql --default-character-set=utf8mb4 -uroot -proot njupt_hub \
    < "${JAVA_ROOT}/src/test/resources/contract/seed/resources.sql"
fi

(
  cd "${REPO_ROOT}/server"
  DATABASE_URL='mysql://root:root@127.0.0.1:3307/njupt_hub?allowPublicKeyRetrieval=true' \
  JWT_SECRET='test-secret-please-change-32-bytes-min' \
  PORT=3200 \
  SMTP_HOST=127.0.0.1 SMTP_PORT=1025 SMTP_SECURE=false \
  SMTP_USER=mailpit SMTP_PASS=mailpit SMTP_FROM=noreply@njupt.hub \
  QINIU_ACCESS_KEY=test QINIU_SECRET_KEY=test QINIU_BUCKET=test \
  QINIU_DOMAIN=kodo.test QINIU_PROTOCOL=https QINIU_IS_PRIVATE=false \
  node src/index.js
) > /tmp/njupt-hub-node-record.log 2>&1 &
NODE_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS http://localhost:3200/health >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

cd "${JAVA_ROOT}"
RECORD_BASE_URL=http://localhost:3200 MAILPIT_URL=http://localhost:8025 \
  node scripts/record-node-contracts.mjs
