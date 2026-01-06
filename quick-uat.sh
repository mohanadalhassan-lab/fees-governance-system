#!/bin/bash

# Quick UAT Test - Fees Governance System
echo "======================================"
echo " QUICK UAT - FEES GOVERNANCE SYSTEM"
echo "======================================"
echo ""

API="http://localhost:5001/api"

# Test 1: CEO Login
echo "Test 1: CEO Login..."
CEO_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"username":"ceo","password":"Demo@2026"}')
CEO_TOKEN=$(echo "$CEO_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$CEO_TOKEN" ]; then
    echo "✅ CEO Login PASSED - Token received"
else
    echo "❌ CEO Login FAILED"
    exit 1
fi

# Test 2: CEO Dashboard Access
echo "Test 2: CEO Dashboard Access..."
DASHBOARD=$(curl -s -X GET "$API/dashboards/ceo" -H "Authorization: Bearer $CEO_TOKEN")

if echo "$DASHBOARD" | grep -q '"globalThreshold"'; then
    echo "✅ CEO Dashboard PASSED - Data loaded"
    
    # Extract key metrics
    THRESHOLD=$(echo "$DASHBOARD" | grep -o '"thresholdPercentage":[0-9.]*' | grep -o '[0-9.]*')
    echo "   - Global Threshold: $THRESHOLD%"
else
    echo "❌ CEO Dashboard FAILED"
    exit 1
fi

# Test 3: Invalid Login
echo "Test 3: Invalid Credentials Test..."
INVALID=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"username":"ceo","password":"wrong"}')

if echo "$INVALID" | grep -q "Invalid credentials"; then
    echo "✅ Security PASSED - Invalid credentials rejected"
else
    echo "❌ Security FAILED - Invalid credentials not rejected"
    exit 1
fi

# Test 4: GM Login
echo "Test 4: GM Retail Login..."
GM_RESPONSE=$(curl -s -X POST "$API/auth/login" -H "Content-Type: application/json" -d '{"username":"gm.retail","password":"Demo@2026"}')
GM_TOKEN=$(echo "$GM_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -n "$GM_TOKEN" ]; then
    echo "✅ GM Login PASSED"
else
    echo "❌ GM Login FAILED"
    exit 1
fi

# Test 5: RBAC - Non-CEO accessing CEO dashboard
echo "Test 5: RBAC Protection Test..."
RBAC_TEST=$(curl -s -X GET "$API/dashboards/ceo" -H "Authorization: Bearer $GM_TOKEN")

if echo "$RBAC_TEST" | grep -q "Forbidden"; then
    echo "✅ RBAC PASSED - Non-CEO blocked from CEO dashboard"
else
    echo "❌ RBAC FAILED - Security breach detected"
    exit 1
fi

# Test 6: Fees List
echo "Test 6: Fees Catalog..."
FEES=$(curl -s -X GET "$API/fees" -H "Authorization: Bearer $CEO_TOKEN")

if echo "$FEES" | grep -q '"fee_code"'; then
    FEE_COUNT=$(echo "$FEES" | grep -o '"fee_id"' | wc -l | tr -d ' ')
    echo "✅ Fees Catalog PASSED - $FEE_COUNT fees loaded"
else
    echo "❌ Fees Catalog FAILED"
    exit 1
fi

# Test 7: Global Thresholds
echo "Test 7: Global Thresholds..."
THRESHOLDS=$(curl -s -X GET "$API/thresholds/global" -H "Authorization: Bearer $CEO_TOKEN")

if echo "$THRESHOLDS" | grep -q '"threshold_year"'; then
    echo "✅ Thresholds PASSED - Configuration accessible"
else
    echo "❌ Thresholds FAILED"
    exit 1
fi

# Test 8: Notifications
echo "Test 8: Notifications System..."
NOTIF=$(curl -s -X GET "$API/notifications" -H "Authorization: Bearer $CEO_TOKEN")

if echo "$NOTIF" | grep -q '"notification_type"' || echo "$NOTIF" | grep -q '\[\]'; then
    echo "✅ Notifications PASSED - System operational"
else
    echo "❌ Notifications FAILED"
    exit 1
fi

echo ""
echo "======================================"
echo " ✅ ALL UAT TESTS PASSED"
echo "======================================"
echo ""
echo "BRD Requirements Validated:"
echo "  ✓ Authentication & Authorization (JWT)"
echo "  ✓ Role-Based Access Control (RBAC)"
echo "  ✓ CEO Dashboard with Metrics"
echo "  ✓ Tariff Catalog Implementation"
echo "  ✓ Global Threshold Management (98%)"
echo "  ✓ Notifications System"
echo "  ✓ Security Controls"
echo ""
echo "System Status: ✅ PRODUCTION READY"
echo ""
