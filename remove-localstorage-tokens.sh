#!/bin/bash
# Script to remove all localStorage token references from client code

CLIENT_DIR="/home/srijan1001/clone_B/Business-Calc/client/src"

echo "🔍 Scanning for localStorage token usage..."

# Find all files with localStorage.getItem('token')
FILES=$(grep -rl "localStorage\.getItem('token')\|localStorage\.getItem(\"token\")" "$CLIENT_DIR" --include="*.jsx" --include="*.js")

echo "📝 Found token references in:"
echo "$FILES"

echo ""
echo "🔧 Removing localStorage token references..."

for file in $FILES; do
    echo "  Processing: $file"
    
    # Remove lines with: const token = localStorage.getItem('token');
    sed -i "/const token = localStorage\.getItem('token');/d" "$file"
    sed -i '/const token = localStorage\.getItem("token");/d' "$file"
    
    # Remove lines with: headers: { 'x-auth-token': token }
    sed -i "/headers: { 'x-auth-token': token }/d" "$file"
    sed -i '/headers: { "x-auth-token": token }/d' "$file"
    
    # Remove lines with: 'x-auth-token': token || '',
    sed -i "/'x-auth-token': token || '',/d" "$file"
    sed -i '/"x-auth-token": token || "",/d' "$file"
    
    # Remove lines with: 'x-auth-token': token
    sed -i "/'x-auth-token': token/d" "$file"
    sed -i '/"x-auth-token": token/d' "$file"
done

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "⚠️  MANUAL REVIEW REQUIRED:"
echo "   Some API calls may now have empty headers objects or missing commas."
echo "   Please review and test each file."
echo ""
echo "📋 Files modified:"
echo "$FILES"
