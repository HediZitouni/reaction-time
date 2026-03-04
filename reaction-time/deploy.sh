#!/bin/bash
set -e

PROJECT_DIR="/root/projects/reaction-time/reaction-time"
DEPLOY_DIR="/var/www/otrom.fr/html/reaction-time"

echo "📦 Build..."
cd "$PROJECT_DIR"
npx expo export --platform web

echo "🚀 Deploy..."
rm -rf "$DEPLOY_DIR"/*
cp -r dist/* "$DEPLOY_DIR"/

echo "✅ Done — https://otrom.fr/reaction-time"
