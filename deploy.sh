#!/bin/bash
# Build the app and copy it to the server. Usage: ./deploy.sh
# Needs Node on this machine and SSH access to the server (key login).
set -euo pipefail

SERVER=${DEPLOY_SERVER:-esteban@206.189.176.206}
TARGET=${DEPLOY_PATH:-/srv/calendar-web}

cd "$(dirname "$0")"
npm run build
rsync -az --delete dist/ "$SERVER:$TARGET/"
echo "Deployed to $SERVER:$TARGET"
