#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if [[ $# -ne 1 ]]; then
  echo "Usage: AGE_IDENTITY_FILE=/secure/path/identity.txt $0 /path/to/backup.tar.gz.age" >&2
  exit 2
fi
: "${AGE_IDENTITY_FILE:?Set AGE_IDENTITY_FILE to the separately stored age private identity}"
archive="$1"
RESTORE_VOLUME="${RESTORE_VOLUME:-nottex_restore_$(date -u +%Y%m%dT%H%M%SZ)}"

command -v age >/dev/null || { echo "age is required on the restore host" >&2; exit 1; }
[[ -r "$archive" ]] || { echo "Backup archive is not readable" >&2; exit 1; }
[[ -r "$AGE_IDENTITY_FILE" ]] || { echo "AGE_IDENTITY_FILE is not readable" >&2; exit 1; }
if docker volume inspect "$RESTORE_VOLUME" >/dev/null 2>&1; then
  echo "Refusing to overwrite existing Docker volume: $RESTORE_VOLUME" >&2
  exit 1
fi

docker volume create "$RESTORE_VOLUME" >/dev/null
restore_succeeded=0
cleanup() {
  if [[ "$restore_succeeded" -ne 1 ]]; then
    docker volume rm "$RESTORE_VOLUME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

age -d -i "$AGE_IDENTITY_FILE" "$archive" \
  | docker run --rm -i -v "$RESTORE_VOLUME:/target" alpine:3.21 \
      sh -c 'tar -xzf - -C /target'
restore_succeeded=1
printf 'Restored into a new staging volume: %s\n' "$RESTORE_VOLUME"
printf 'After validating it, set MONGODB_VOLUME_NAME=%s in .env and start MongoDB/backend.\n' "$RESTORE_VOLUME"
