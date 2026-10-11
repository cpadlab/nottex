#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

: "${AGE_RECIPIENT:?Set AGE_RECIPIENT to the age public recipient used for encrypted backups}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
if [[ -z "${MONGODB_VOLUME_NAME:-}" && -f .env ]]; then
  MONGODB_VOLUME_NAME="$(awk -F= '$1 == "MONGODB_VOLUME_NAME" { print substr($0, index($0, "=") + 1); exit }' .env)"
fi
MONGODB_VOLUME_NAME="${MONGODB_VOLUME_NAME:-nottex_mongodb_data}"

command -v age >/dev/null || { echo "age is required on the backup host" >&2; exit 1; }
[[ "$BACKUP_RETENTION_DAYS" =~ ^[1-9][0-9]*$ ]] || {
  echo "BACKUP_RETENTION_DAYS must be a positive integer" >&2
  exit 1
}

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DIR/nottex-mongodb-$timestamp.tar.gz.age"
temporary_archive="$archive.tmp"

restart_services() {
  docker compose up -d mongodb backend >/dev/null || true
}
cleanup() {
  rm -f "$temporary_archive"
  restart_services
}
trap cleanup EXIT

docker compose stop backend mongodb
docker run --rm -v "$MONGODB_VOLUME_NAME:/source:ro" alpine:3.21 \
  sh -c 'tar -czf - -C /source .' \
  | age -r "$AGE_RECIPIENT" -o "$temporary_archive"
chmod 600 "$temporary_archive"
mv -- "$temporary_archive" "$archive"

find "$BACKUP_DIR" -type f -name 'nottex-mongodb-*.tar.gz.age' \
  -mtime "+$BACKUP_RETENTION_DAYS" -delete
printf 'Encrypted backup created: %s\n' "$archive"
