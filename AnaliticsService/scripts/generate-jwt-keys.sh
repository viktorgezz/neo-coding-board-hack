#!/usr/bin/env sh
# RSA key pair for JWT: PKCS#8 private + SPKI public (same format as core-service KeyUtils).
# *.pem are gitignored. Copy private_key.pem to core-service .../resources/keys/ for signing.
# public_key.pem: keep a copy here for Python services / Docker bind-mount.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYS_DIR="$ROOT/keys"
mkdir -p "$KEYS_DIR"
cd "$KEYS_DIR"
TMP=rsa_pkcs1.pem
openssl genrsa -out "$TMP" 2048
openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in "$TMP" -out private_key.pem
openssl rsa -in private_key.pem -pubout -out public_key.pem
rm -f "$TMP"
echo "Wrote $KEYS_DIR/private_key.pem and $KEYS_DIR/public_key.pem"
