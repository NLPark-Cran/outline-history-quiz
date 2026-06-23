#!/bin/bash
set -e

cd /root/workspace/test0607/outline

echo "[1/4] Installing dependencies..."
npm ci

echo "[2/4] Running database migrations..."
npx drizzle-kit migrate

echo "[3/4] Building Next.js standalone..."
npm run build

echo "[4/4] Installing systemd service..."
cp scripts/outline-quiz.service /etc/systemd/system/outline-quiz.service
systemctl daemon-reload
systemctl enable outline-quiz
systemctl restart outline-quiz

echo "[done] Deployment finished. Check status with: systemctl status outline-quiz"
