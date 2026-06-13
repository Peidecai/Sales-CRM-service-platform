#!/usr/bin/env bash
# Generate RSA key pair for JWT RS256 signing
# Usage: bash scripts/generate-keys.sh
# On Windows: use Git Bash, WSL, or PowerShell with OpenSSL installed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_DIR="${SCRIPT_DIR}/../keys"

mkdir -p "$KEY_DIR"

echo "Generating RSA 2048-bit key pair for JWT RS256..."

# Generate private key
openssl genrsa -out "${KEY_DIR}/private.pem" 2048

# Extract public key
openssl rsa -in "${KEY_DIR}/private.pem" -pubout -out "${KEY_DIR}/public.pem"

echo ""
echo "Keys generated:"
echo "  Private key: ${KEY_DIR}/private.pem"
echo "  Public key:  ${KEY_DIR}/public.pem"
echo ""
echo "For .env configuration, convert to single-line format:"
echo ""
echo "JWT_PRIVATE_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "${KEY_DIR}/private.pem")\""
echo ""
echo "JWT_PUBLIC_KEY=\"$(awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' "${KEY_DIR}/public.pem")\""
echo ""
echo "IMPORTANT: Do NOT commit private.pem to version control!"
