#!/bin/bash

# UAT Testing Script for Fees Governance System
# Tests all critical functionality based on BRD requirements

echo "======================================"
echo "🧪 UAT Testing - Fees Governance System"
echo "======================================"
echo ""

BASE_URL="http://localhost:5001"
PASS_COUNT=0
FAIL_COUNT=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local headers="$4"
    local data="$5"
    local expected_key="$6"
    
    echo -n "Testing: $test_name... "
    
    if [ "$method" == "POST" ]; then
        response=$(curl -s -X POST "$BASE_URL$endpoint" $headers -d "$data")
    else
        response=$(curl -s "$BASE_URL$endpoint" $headers)
    fi
    
    if echo "$response" | grep -q "$expected_key"; then
        echo -e "${GREEN}✅ PASS${NC}"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Response: $response" | head -c 200
        ((FAIL_COUNT++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing Basic Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 1: Health Check
test_api "Health Check" "GET" "/health" "" "" "status"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing Authentication"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 2: CEO Login
CEO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"ceo","password":"Demo@2026"}')
CEO_TOKEN=$(echo "$CEO_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -n "$CEO_TOKEN" ]; then
    echo -e "Testing: CEO Login... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "Testing: CEO Login... ${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
fi

# Test 3: GM Finance Login
GM_FIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"gm.finance","password":"Demo@2026"}')
GM_FIN_TOKEN=$(echo "$GM_FIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -n "$GM_FIN_TOKEN" ]; then
    echo -e "Testing: GM Finance Login... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "Testing: GM Finance Login... ${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
fi

# Test 4: GM Risk Login
GM_RISK_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"gm.risk","password":"Demo@2026"}')
GM_RISK_TOKEN=$(echo "$GM_RISK_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -n "$GM_RISK_TOKEN" ]; then
    echo -e "Testing: GM Risk Login... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "Testing: GM Risk Login... ${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
fi

# Test 5: GM Compliance Login
GM_COMP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" -H "Content-Type: application/json" -d '{"username":"gm.compliance","password":"Demo@2026"}')
GM_COMP_TOKEN=$(echo "$GM_COMP_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))" 2>/dev/null)

if [ -n "$GM_COMP_TOKEN" ]; then
    echo -e "Testing: GM Compliance Login... ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
else
    echo -e "Testing: GM Compliance Login... ${RED}❌ FAIL${NC}"
    ((FAIL_COUNT++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing CEO Dashboard APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

AUTH_HEADER="-H \"Authorization: Bearer $CEO_TOKEN\""

# Test 6: CEO Dashboard
test_api "CEO Dashboard" "GET" "/api/dashboards/ceo" "$AUTH_HEADER" "" "global_threshold"

# Test 7: Fees List
test_api "Fees List" "GET" "/api/fees" "$AUTH_HEADER" "" "fees"

# Test 8: Exemptions List
test_api "Exemptions List" "GET" "/api/exemptions/sector" "$AUTH_HEADER" "" "exemptions"

# Test 9: Thresholds
test_api "Threshold Settings" "GET" "/api/thresholds/current" "$AUTH_HEADER" "" "threshold_year"

# Test 10: Satisfaction Status
test_api "Satisfaction Status" "GET" "/api/satisfaction" "$AUTH_HEADER" "" "total_fees"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Testing GM Dashboard APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 11: GM Finance Dashboard
GM_FIN_AUTH="-H \"Authorization: Bearer $GM_FIN_TOKEN\""
test_api "GM Finance Dashboard" "GET" "/api/dashboards/gm-finance?period=ANNUAL" "$GM_FIN_AUTH" "" "summary"

# Test 12: GM Risk Dashboard
GM_RISK_AUTH="-H \"Authorization: Bearer $GM_RISK_TOKEN\""
test_api "GM Risk Dashboard" "GET" "/api/dashboards/gm-risk?period=ANNUAL" "$GM_RISK_AUTH" "" "summary"

# Test 13: GM Compliance Dashboard
GM_COMP_AUTH="-H \"Authorization: Bearer $GM_COMP_TOKEN\""
test_api "GM Compliance Dashboard" "GET" "/api/dashboards/gm-compliance?period=ANNUAL" "$GM_COMP_AUTH" "" "summary"

# Test 14: GM Retail Dashboard
test_api "GM Retail Dashboard" "GET" "/api/dashboards/gm-retail?segment=MASS" "$AUTH_HEADER" "" "summary"

# Test 15: GM Corporate Dashboard
test_api "GM Corporate Dashboard" "GET" "/api/dashboards/gm-corporate?category=Trade%20Finance" "$AUTH_HEADER" "" "summary"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing Reports APIs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 16: Fee Performance Report
test_api "Fee Performance Report" "GET" "/api/reports/fee-performance" "$AUTH_HEADER" "" "report_data"

# Test 17: Exemptions Report
test_api "Exemptions Report" "GET" "/api/reports/exemptions" "$AUTH_HEADER" "" "report_data"

# Test 18: Satisfaction Report
test_api "Satisfaction Report" "GET" "/api/reports/satisfaction" "$AUTH_HEADER" "" "report_data"

# Test 19: Revenue Gap Report
test_api "Revenue Gap Report" "GET" "/api/reports/revenue-gap" "$AUTH_HEADER" "" "report_data"

# Test 20: Executive Summary
test_api "Executive Summary" "GET" "/api/reports/executive-summary" "$AUTH_HEADER" "" "report_data"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Testing Notifications"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test 21: Notifications List
test_api "Notifications List" "GET" "/api/notifications" "$AUTH_HEADER" "" "notifications"

echo ""
echo "======================================"
echo "📊 UAT Test Results Summary"
echo "======================================"
echo ""
echo -e "${GREEN}✅ Passed: $PASS_COUNT${NC}"
echo -e "${RED}❌ Failed: $FAIL_COUNT${NC}"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
if [ $TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((PASS_COUNT * 100 / TOTAL))
    echo "Success Rate: $SUCCESS_RATE%"
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready for production.${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi
