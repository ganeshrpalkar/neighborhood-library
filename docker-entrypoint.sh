#!/bin/bash

# Container entrypoint: creates required log directories, then execs the container command.

set -e

echo "Creating log directories..."
mkdir -p /var/log/app
chmod -R 1777 /var/log/app 2>/dev/null || true

# Ensure parent dirs exist for configured log file paths.
for _log_var in LOG_FILE DEBUG_LOGFILE CELERY_LOGFILE; do
  _path="${!_log_var}"
  if [ -n "$_path" ]; then
    _dir="$(dirname "$_path")"
    if [ "$_dir" != "." ] && [ -n "$_dir" ]; then
      mkdir -p "$_dir"
      chmod -R 1777 "$_dir" 2>/dev/null || true
    fi
  fi
done

echo "Creating tmp directory..."
mkdir -p /tmp
chmod -R 1777 /tmp

exec "$@"
