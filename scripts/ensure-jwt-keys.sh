#!/usr/bin/env bash
# Генерирует пару RSA-ключей для JWT: кладёт приватный и публичный в core-service (для сборки JAR)
# и копирует публичный в AnaliticsService/keys (для Python-сервисов в Docker).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_DIR="$ROOT/core-service/app/src/main/resources/keys"
PUB_OUT="$ROOT/AnaliticsService/keys/public_key.pem"

mkdir -p "$KEY_DIR" "$(dirname "$PUB_OUT")"

if [[ -f "$KEY_DIR/private_key.pem" && -f "$KEY_DIR/public_key.pem" ]]; then
  echo "JWT keys already exist under $KEY_DIR — syncing public key to AnaliticsService/keys if needed."
  cp -f "$KEY_DIR/public_key.pem" "$PUB_OUT"
  echo "Done: $PUB_OUT"
  exit 0
fi

echo "Generating RSA key pair in $KEY_DIR ..."
openssl genrsa -out "$KEY_DIR/private_key.pem" 2048
openssl rsa -in "$KEY_DIR/private_key.pem" -pubout -out "$KEY_DIR/public_key.pem"
cp -f "$KEY_DIR/public_key.pem" "$PUB_OUT"
echo "Done. Public key for Python services: $PUB_OUT"
