#!/bin/bash 
 
# Runs only the e2e test file(s) that changed since last git commit. 
# Usage: bash scripts/test-changed.sh 
# Pass a specific file to force-run: bash scripts/test-changed.sh e2e/inventory.spec.ts 
if [ -n "$1" ]; then 
echo "▶ Running single file: $1" 
npx playwright test "$1" --reporter=line 
exit $? 
fi 
 
CHANGED=$(git diff --name-only HEAD~1 HEAD -- 'e2e/*.spec.ts' 2>/dev/null) 
 
if [ -z "$CHANGED" ]; then 
echo "No e2e spec files changed. Running full suite." 
npx playwright test --reporter=line 
else 
echo "Changed specs:" 
echo "$CHANGED" 
for file in $CHANGED; do 
npx playwright test "$file" --reporter=line 
done 
fi 