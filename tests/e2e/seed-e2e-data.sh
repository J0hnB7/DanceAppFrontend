#!/usr/bin/env bash
# Seed persistent E2E fixture data and write .env.test.local
# Usage: bash tests/e2e/seed-e2e-data.sh
set -euo pipefail

BASE="http://localhost:8080"
OUT="$(dirname "$0")/../../.env.test.local"

# ── helpers ──────────────────────────────────────────────────────────────────
post() { local r; r=$(curl -s -X POST "$BASE$1" -H "Content-Type: application/json" "${@:2}"); echo "$r"; }
put()  { curl -s -X PUT  "$BASE$1" -H "Content-Type: application/json" "${@:2}" > /dev/null; }
jq_()  { python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"; }

echo "🔐 Logging in as admin..."
ADMIN_TOKEN=$(post /api/v1/auth/login -d '{"email":"admin@danceapp.local","password":"Admin123!"}' | jq_ 'd["accessToken"]')
AUTH=(-H "Authorization: Bearer $ADMIN_TOKEN")

echo "🏆 Creating E2E fixture competition..."
COMP=$(post /api/v1/competitions "${AUTH[@]}" -d '{
  "name":  "E2E Fixture Competition",
  "eventDate": "2099-12-31",
  "venue": "E2E Test Venue",
  "contactEmail": "admin@danceapp.local",
  "federation": "NATIONAL",
  "roleMode": "ORGANIZER_ONLY"
}')
COMP_ID=$(echo "$COMP" | jq_ 'd["id"]')
COMP_SLUG=$(echo "$COMP" | jq_ 'd.get("slug", d["id"])')

echo "   Competition: $COMP_ID (slug: $COMP_SLUG)"

echo "📂 Creating section..."
SECTION_ID=$(post /api/v1/competitions/$COMP_ID/sections "${AUTH[@]}" -d '{
  "name": "Adult Latin D",
  "ageCategory": "ADULT",
  "danceStyle": "LATIN",
  "level": "D",
  "competitorType": "AMATEURS",
  "competitionType": "COUPLE",
  "dances": ["CHA_CHA","SAMBA"],
  "numberOfJudges": 3,
  "maxFinalPairs": 6,
  "orderIndex": 0,
  "minBirthYear": 1970,
  "maxBirthYear": 2005
}' | jq_ 'd["id"]')

echo "   Section: $SECTION_ID"

echo "🔓 Opening registration..."
put /api/v1/competitions/$COMP_ID "${AUTH[@]}" -d '{"registrationOpen":true}' > /dev/null

echo "👥 Adding pair to section..."
post /api/v1/competitions/$COMP_ID/pairs "${AUTH[@]}" -d "{
  \"dancer1Name\": \"E2E Tanecnik\",
  \"dancer1FirstName\": \"E2E\",
  \"dancer1LastName\": \"Tanecnik\",
  \"dancer2Name\": \"E2E Partner\",
  \"dancer2FirstName\": \"E2E\",
  \"dancer2LastName\": \"Partner\",
  \"sectionId\": \"$SECTION_ID\"
}" > /dev/null

echo "⚖️  Creating judge token..."
JUDGE=$(post /api/v1/competitions/$COMP_ID/judge-tokens "${AUTH[@]}" -d '{"judgeNumber":1,"role":"JUDGE"}')
JUDGE_TOKEN=$(echo "$JUDGE" | jq_ 'd["rawToken"]')
JUDGE_PIN=$(echo "$JUDGE"   | jq_ 'd["pin"]')
echo "   Judge token: $JUDGE_TOKEN (PIN: $JUDGE_PIN)"

echo "💃 Registering dancer..."
DANCER_EMAIL="e2e.dancer.$(date +%s)@test.local"
DANCER_PASSWORD="DancerPass1!"
post /api/v1/auth/register/dancer -d "{
  \"email\": \"$DANCER_EMAIL\",
  \"password\": \"$DANCER_PASSWORD\",
  \"firstName\": \"E2E\",
  \"lastName\": \"Dancer\",
  \"gdprAccepted\": true
}" > /dev/null

DANCER_TOKEN=$(post /api/v1/auth/login -d "{\"email\":\"$DANCER_EMAIL\",\"password\":\"$DANCER_PASSWORD\"}" | jq_ 'd["accessToken"]')
put /api/v1/profile/dancer/onboarding -H "Authorization: Bearer $DANCER_TOKEN" -d '{
  "firstName":"E2E","lastName":"Dancer","birthYear":1995,"club":"Test Club","gender":"MALE"
}' > /dev/null
echo "   Dancer: $DANCER_EMAIL"

echo "📝 Writing $OUT ..."
cat > "$OUT" <<EOF
E2E_COMPETITION_ID=$COMP_ID
E2E_COMPETITION_SLUG=$COMP_SLUG
E2E_JUDGE_TOKEN=$JUDGE_TOKEN
E2E_JUDGE_PIN=$JUDGE_PIN
E2E_DANCER_EMAIL=$DANCER_EMAIL
E2E_DANCER_PASSWORD=$DANCER_PASSWORD
E2E_DANCER_BIRTH_YEAR=1995
EOF

echo ""
echo "✅  Done! Env written to $OUT"
echo "   source the file or run: npx playwright test"
