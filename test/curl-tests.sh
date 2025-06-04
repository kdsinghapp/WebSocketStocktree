#!/bin/bash

# Angel Broking API Test Script using cURL
# Usage: ./curl-tests.sh [BASE_URL]

# Set base URL (default to localhost)
BASE_URL=${1:-"http://localhost:3000"}

echo "🧪 Angel Broking API cURL Tests"
echo "Base URL: $BASE_URL"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    
    echo -e "\n${BLUE}Test $TESTS_TOTAL: $test_name${NC}"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    # Build curl command
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$BASE_URL$endpoint'"
    
    # Execute curl command
    local response=$(eval $curl_cmd)
    local status_code="${response: -3}"
    local body="${response%???}"
    
    echo "Status Code: $status_code"
    
    # Check if test passed
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        
        # Pretty print JSON if response is not empty
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "Response:"
            echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
        fi
    else
        echo -e "${RED}❌ FAILED${NC}"
        echo "Expected: $expected_status, Got: $status_code"
        if [ -n "$body" ]; then
            echo "Response: $body"
        fi
    fi
}

# Test 1: Check authentication status
run_test "Authentication Status" "GET" "/api/auth/status" "" "200"

# Test 2: Login
run_test "Login to Angel Broking" "POST" "/api/auth/login" "{}" "200"

# Test 3: Get market data (might be empty initially)
run_test "Get Market Data" "GET" "/api/market/data?limit=5" "" "200"

# Test 4: Refresh market data
run_test "Refresh Market Data" "POST" "/api/market/refresh" "{}" "200"

# Test 5: Get market data again
run_test "Get Market Data (After Refresh)" "GET" "/api/market/data?limit=5" "" "200"

# Test 6: Get market summary
run_test "Market Summary" "GET" "/api/market/summary" "" "200"

# Test 7: Get specific exchange data
run_test "NSE Market Data" "GET" "/api/market/data?exchange=NSE&limit=3" "" "200"

# Test 8: Test with invalid endpoint (should fail)
run_test "Invalid Endpoint (Should Fail)" "GET" "/api/invalid/endpoint" "" "404"

# Summary
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}================================${NC}"

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 All tests passed! ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
    exit 0
elif [ $TESTS_PASSED -gt $((TESTS_TOTAL / 2)) ]; then
    echo -e "${YELLOW}⚠️ Most tests passed ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
    echo -e "${YELLOW}Check failed tests for issues.${NC}"
    exit 1
else
    echo -e "${RED}❌ Multiple tests failed ($TESTS_PASSED/$TESTS_TOTAL)${NC}"
    echo -e "${RED}Check your API configuration.${NC}"
    exit 2
fi
