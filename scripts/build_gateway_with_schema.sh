#!/usr/bin/env bash
set -euo pipefail

CRATE_DIR="${1:?crate directory is required}"
BINARY_NAME="${2:?binary name is required}"
DB_NAME="${SQLX_BUILD_DB_NAME:-blindmarkets}"
DB_PORT="${SQLX_BUILD_DB_PORT:-55432}"
DB_SUPERUSER="${SQLX_BUILD_DB_USER:-postgres}"
WORK_DIR="$(mktemp -d)"
PGDATA="${WORK_DIR}/pgdata"
PGSOCKET="${WORK_DIR}/socket"
PGLOG="${WORK_DIR}/postgres.log"

find_postgres_bin() {
  local name="$1"
  if command -v "${name}" >/dev/null 2>&1; then
    command -v "${name}"
    return 0
  fi

  local discovered
  discovered="$(find /usr/lib/postgresql /opt/homebrew /usr/local -type f -name "${name}" 2>/dev/null | sort | tail -n 1 || true)"
  if [[ -z "${discovered}" ]]; then
    echo "Missing required PostgreSQL binary: ${name}" >&2
    exit 1
  fi
  echo "${discovered}"
}

run_as_db_user() {
  if id postgres >/dev/null 2>&1; then
    if command -v runuser >/dev/null 2>&1; then
      runuser -u postgres -- "$@"
    else
      local quoted_command=""
      local arg
      for arg in "$@"; do
        quoted_command+=" $(printf '%q' "${arg}")"
      done
      su -s /bin/sh postgres -c "${quoted_command# }"
    fi
  else
    "$@"
  fi
}

INITDB_BIN="$(find_postgres_bin initdb)"
PG_CTL_BIN="$(find_postgres_bin pg_ctl)"
CREATEDB_BIN="$(find_postgres_bin createdb)"
PSQL_BIN="$(find_postgres_bin psql)"

cleanup() {
  if [[ -d "${PGDATA}" ]]; then
    run_as_db_user "${PG_CTL_BIN}" -D "${PGDATA}" stop -m fast >/dev/null 2>&1 || true
  fi
  rm -rf "${WORK_DIR}"
}
trap cleanup EXIT

mkdir -p "${PGDATA}" "${PGSOCKET}"
if id postgres >/dev/null 2>&1; then
  chown -R postgres:postgres "${WORK_DIR}"
fi

run_as_db_user "${INITDB_BIN}" -D "${PGDATA}" --username "${DB_SUPERUSER}" --auth trust >/dev/null
run_as_db_user "${PG_CTL_BIN}" -D "${PGDATA}" -l "${PGLOG}" -o "-p ${DB_PORT} -k ${PGSOCKET}" start >/dev/null

until run_as_db_user "${PSQL_BIN}" -h "${PGSOCKET}" -p "${DB_PORT}" -U "${DB_SUPERUSER}" -d postgres -c "SELECT 1" >/dev/null 2>&1; do
  sleep 1
done

run_as_db_user "${CREATEDB_BIN}" -h "${PGSOCKET}" -p "${DB_PORT}" -U "${DB_SUPERUSER}" "${DB_NAME}"

for migration in "${CRATE_DIR}"/migrations/*.sql; do
  run_as_db_user "${PSQL_BIN}" -h "${PGSOCKET}" -p "${DB_PORT}" -U "${DB_SUPERUSER}" -d "${DB_NAME}" -f "${migration}" >/dev/null
done

export DATABASE_URL="postgresql://${DB_SUPERUSER}@localhost:${DB_PORT}/${DB_NAME}"

CARGO_ARGS=(build --release --manifest-path "${CRATE_DIR}/Cargo.toml" --bin "${BINARY_NAME}")
if [[ -f "${CRATE_DIR}/Cargo.lock" ]]; then
  CARGO_ARGS+=(--locked)
fi

cargo "${CARGO_ARGS[@]}"
