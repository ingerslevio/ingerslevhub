#!/usr/bin/env bash
# Seed child users and link them to existing students
# Requires: API running at localhost, admin session cookie
# Usage: API_URL=http://localhost:3000 COOKIE="session=..." ./scripts/seed-children.sh

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
COOKIE="${COOKIE:-}"
PASSWORD="reyfv6wqpzgy64"

if [ -z "$COOKIE" ]; then
  echo "Error: COOKIE env var required (e.g. COOKIE='session=eyJ...')"
  echo "Get it from browser devtools after logging in as admin"
  exit 1
fi

echo "Creating child users..."

for child in "agnes@ingerslev.io:Agnes" "albert@ingerslev.io:Albert" "ellen@ingerslev.io:Ellen"; do
  email="${child%%:*}"
  name="${child##*:}"
  echo "  Creating $name ($email)..."
  curl -s -X POST "$API_URL/api/admin/users" \
    -H "Content-Type: application/json" \
    -H "Cookie: $COOKIE" \
    -d "{\"email\":\"$email\",\"name\":\"$name\",\"password\":\"$PASSWORD\",\"role\":\"user\"}" \
    | head -c 200
  echo
done

echo ""
echo "Fetching students and users to link..."

STUDENTS=$(curl -s "$API_URL/api/admin/students" -H "Cookie: $COOKIE")
USERS=$(curl -s "$API_URL/api/admin/users" -H "Cookie: $COOKIE")

echo "Students: $STUDENTS" | head -c 500
echo ""
echo ""
echo "To link users to students, use the Admin UI or call:"
echo "  curl -X PATCH \$API_URL/api/admin/students/<studentId> -H 'Cookie: \$COOKIE' -H 'Content-Type: application/json' -d '{\"userId\":\"<userId>\"}'"
echo ""
echo "Done."
