#!/usr/bin/env bash
set -euo pipefail
VALIDATION_DIR="architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/validation"
if [ -f "$VALIDATION_DIR/preview-server.pid" ]; then
  old_pid=$(cat "$VALIDATION_DIR/preview-server.pid" || true)
  if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" || true
    sleep 1
  fi
fi
# Stop earlier Vite dev servers without matching this script's shell command line.
pids=$(pgrep -f "node .*vite.*--host 0.0.0.0" || true)
if [ -n "$pids" ]; then
  kill $pids || true
  sleep 1
fi
nohup npm run dev --workspace=frontend -- --host 0.0.0.0 > "$VALIDATION_DIR/preview-server.stdout.log" 2> "$VALIDATION_DIR/preview-server.stderr.log" &
echo $! > "$VALIDATION_DIR/preview-server.pid"
sleep 6
echo "Preview PID: $(cat "$VALIDATION_DIR/preview-server.pid")"
curl -I --max-time 10 http://127.0.0.1:5173/
