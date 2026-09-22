#!/usr/bin/env bash
# SITE tato preview: Astro :4322 + pages:dev :8788 (News /api via Vite proxy).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PAGES_PID=""

cleanup() {
  if [[ -n "${PAGES_PID}" ]] && kill -0 "${PAGES_PID}" 2>/dev/null; then
    kill "${PAGES_PID}" 2>/dev/null || true
    wait "${PAGES_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "==> bun run build (pages:dev needs dist/)"
bun run build

echo "==> bun run pages:dev (:8788)"
bun run pages:dev &
PAGES_PID=$!

# Give wrangler a moment before Astro starts proxying /api.
sleep 2

if ! kill -0 "${PAGES_PID}" 2>/dev/null; then
  echo "pages:dev failed to start" >&2
  exit 1
fi

echo "==> bun run dev (:4322) — Ctrl+C stops both"
bun run dev
