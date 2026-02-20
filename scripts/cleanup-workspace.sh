#!/usr/bin/env bash

set -e

echo "🧹 Starting repository cleanup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Root directory safety check
if [ ! -f "turbo.json" ] && [ ! -f "package.json" ]; then
  echo -e "${RED}Error: Run this script from repo root${NC}"
  exit 1
fi

# Remove node_modules everywhere
echo "Removing node_modules..."
find . -type d -name "node_modules" -prune -exec rm -rf '{}' +

# Remove Turbo cache
echo "Removing .turbo cache..."
rm -rf .turbo

# Remove ALL .turbo folders everywhere
echo "Removing all .turbo folders..."
find . -type d -name ".turbo" -prune -exec rm -rf {} +

# Remove Next.js build artifacts
echo "Removing Next.js build artifacts..."
find . -type d -name ".next" -prune -exec rm -rf '{}' +

# Remove dist folders
echo "Removing dist folders..."
find . -type d -name "dist" -prune -exec rm -rf '{}' +

# Remove build folders
echo "Removing build folders..."
find . -type d -name "build" -prune -exec rm -rf '{}' +

# Remove coverage folders
echo "Removing coverage folders..."
find . -type d -name "coverage" -prune -exec rm -rf '{}' +

# Remove cache folders
echo "Removing cache folders..."
find . -type d -name ".cache" -prune -exec rm -rf '{}' +

# Remove log files
echo "Removing log files..."
find . -type f -name "*.log" -delete

# Remove turbo daemon files
rm -rf node_modules/.cache/turbo

# Optional: Remove lockfile if needed (commented)
# rm -f package-lock.json pnpm-lock.yaml yarn.lock

echo -e "${GREEN}✅ Repository cleanup complete!${NC}"