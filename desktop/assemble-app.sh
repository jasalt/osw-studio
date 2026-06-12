#!/bin/bash

# Assemble the desktop app/ directory from a completed Next.js standalone build.
# Shared by CI (.github/workflows/desktop-release.yml) and local builds
# (deploy-osw-desktop.sh) so the two can never drift.
#
# Expects to run from the repo root (osw-studio-git) AFTER:
#   NEXT_PUBLIC_SERVER_MODE=true NEXT_PUBLIC_DESKTOP=true npm run build

set -e

if [ ! -d ".next/standalone" ]; then
    echo "Error: .next/standalone not found — run the Next.js build first:"
    echo "  NEXT_PUBLIC_SERVER_MODE=true NEXT_PUBLIC_DESKTOP=true npm run build"
    exit 1
fi

rm -rf desktop/app
mkdir -p desktop/app

# Standalone server + runtime
cp -r .next/standalone/. desktop/app/

# Scrub local server-mode state that Next's build-time file tracing can pull
# into the standalone output on dev machines (the build reads the dev database
# in Server Mode). Shipping these would leak local data into the installer.
rm -rf desktop/app/data desktop/app/deployments desktop/app/sites

# Static assets (not included in standalone)
mkdir -p desktop/app/.next/static
cp -r .next/static/. desktop/app/.next/static/

# Public files (excluding local sites/deployments)
cp -r public desktop/app/public
rm -rf desktop/app/public/sites desktop/app/public/deployments

# Docs for the documentation API
cp -r docs desktop/app/docs 2>/dev/null || true

echo "Desktop app directory assembled: desktop/app"
