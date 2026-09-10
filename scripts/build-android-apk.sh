#!/usr/bin/env bash
set -e

echo "=== 1. Proje Web Çıktısı Derleniyor (Vite + Server) ==="
npm run build

echo "=== 2. Standart Android APK Paketi ve İmzası Hazırlanıyor ==="
python3 scripts/repackage-apk.py

echo "=== BAŞARILI! APK OLUŞTURULDU ==="
ls -lh dist-apk/personal-ai-assistant-debug.apk
