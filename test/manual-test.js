const axios = require("axios")

// Manual testing functions for step-by-step verification

const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

console.log("🔧 Manual API Testing Tool")
console.log(`Base URL: ${BASE_URL}`)
console.log("=".repeat(50))

// Test 1: Basic connectivity
async function testConnectivity() {
  console.log("\n1️⃣ Testing Basic Connectivity...")

  try {
    const response = await axios.get(`${BASE_URL}/api/auth/status`, { timeout: 10000 })
    console.log("✅ Server is reachable")
    console.log("📊 Response:", JSON.stringify(response.data, null, 2))
    return true
  } catch (error) {
    console.log("❌ Server connectivity failed")
    console.log("Error:", error.message)
    if (error.response) {
      console.log("Status:", error.response.status)
      console.log("Data:", error.response.data)
    }
    return false
  }
}

// Test 2: Authentication
async function testAuthentication() {
  console.log("\n2️⃣ Testing Authentication...")

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {}, { timeout: 30000 })
    console.log("✅ Authentication successful")
    console.log("📊 Response:", JSON.stringify(response.data, null, 2))
    return true
  } catch (error) {
    console.log("❌ Authentication failed")
    console.log("Error:", error.message)
    if (error.response) {
      console.log("Status:", error.response.status)
      console.log("Data:", JSON.stringify(error.response.data, null, 2))
    }
    return false
  }
}

// Test 3: Market data refresh
async function testMarketDataRefresh() {
  console.log("\n3️⃣ Testing Market Data Refresh...")

  try {
    const response = await axios.post(`${BASE_URL}/api/market/refresh`, {}, { timeout: 60000 })
    console.log("✅ Market data refresh successful")
    console.log("📊 Response:", JSON.stringify(response.data, null, 2))
    return true
  } catch (error) {
    console.log("❌ Market data refresh failed")
    console.log("Error:", error.message)
    if (error.response) {
      console.log("Status:", error.response.status)
      console.log("Data:", JSON.stringify(error.response.data, null, 2))
    }
    return false
  }
}

// Test 4: Get market data
async function testGetMarketData() {
  console.log("\n4️⃣ Testing Get Market Data...")

  try {
    const response = await axios.get(`${BASE_URL}/api/market/data?limit=5`, { timeout: 10000 })
    console.log("✅ Get market data successful")
    console.log("📊 Data count:", response.data.data?.length || 0)

    if (response.data.data && response.data.data.length > 0) {
      console.log("📈 Sample stock data:")
      const sample = response.data.data[0]
      console.log(`   Symbol: ${sample.symbol}`)
      console.log(`   Exchange: ${sample.exchange}`)
      console.log(`   LTP: ₹${sample.ltp}`)
      console.log(`   Change: ${sample.changePercent?.toFixed(2)}%`)
      console.log(`   Last Updated: ${sample.lastUpdated}`)
    }

    return true
  } catch (error) {
    console.log("❌ Get market data failed")
    console.log("Error:", error.message)
    if (error.response) {
      console.log("Status:", error.response.status)
      console.log("Data:", JSON.stringify(error.response.data, null, 2))
    }
    return false
  }
}

// Test 5: Market summary
async function testMarketSummary() {
  console.log("\n5️⃣ Testing Market Summary...")

  try {
    const response = await axios.get(`${BASE_URL}/api/market/summary`, { timeout: 10000 })
    console.log("✅ Market summary successful")

    if (response.data.summary) {
      const summary = response.data.summary
      console.log("📊 Market Summary:")
      console.log(`   Total Stocks: ${summary.totalStocks}`)
      console.log(`   Gainers: ${summary.overall.gainers}`)
      console.log(`   Losers: ${summary.overall.losers}`)
      console.log(`   Average Change: ${summary.overall.avgChange?.toFixed(2)}%`)

      if (summary.exchanges) {
        console.log("📈 Exchange Summary:")
        for (const [exchange, data] of Object.entries(summary.exchanges)) {
          console.log(`   ${exchange}: ${data.totalStocks} stocks, ${data.avgChange?.toFixed(2)}% avg change`)
        }
      }
    }

    return true
  } catch (error) {
    console.log("❌ Market summary failed")
    console.log("Error:", error.message)
    if (error.response) {
      console.log("Status:", error.response.status)
      console.log("Data:", JSON.stringify(error.response.data, null, 2))
    }
    return false
  }
}

// Run all manual tests
async function runManualTests() {
  console.log("🚀 Starting Manual Tests...\n")

  const results = {
    connectivity: false,
    authentication: false,
    marketRefresh: false,
    marketData: false,
    marketSummary: false,
  }

  // Test connectivity first
  results.connectivity = await testConnectivity()
  if (!results.connectivity) {
    console.log("\n❌ Stopping tests - server not reachable")
    return results
  }

  // Test authentication
  results.authentication = await testAuthentication()
  if (!results.authentication) {
    console.log("\n⚠️ Authentication failed - continuing with other tests")
  }

  // Test market data refresh (only if authenticated)
  if (results.authentication) {
    results.marketRefresh = await testMarketDataRefresh()
  }

  // Test getting market data
  results.marketData = await testGetMarketData()

  // Test market summary
  results.marketSummary = await testMarketSummary()

  // Summary
  console.log("\n" + "=".repeat(50))
  console.log("📋 TEST RESULTS SUMMARY")
  console.log("=".repeat(50))

  const tests = [
    { name: "Connectivity", result: results.connectivity },
    { name: "Authentication", result: results.authentication },
    { name: "Market Refresh", result: results.marketRefresh },
    { name: "Market Data", result: results.marketData },
    { name: "Market Summary", result: results.marketSummary },
  ]

  let passed = 0
  tests.forEach((test) => {
    const status = test.result ? "✅ PASS" : "❌ FAIL"
    console.log(`${status} ${test.name}`)
    if (test.result) passed++
  })

  console.log(`\n🎯 Overall: ${passed}/${tests.length} tests passed`)

  if (passed === tests.length) {
    console.log("🎉 All tests passed! Your API is working correctly.")
  } else if (passed >= 3) {
    console.log("⚠️ Most tests passed. Check failed tests for issues.")
  } else {
    console.log("❌ Multiple tests failed. Check your configuration.")
  }

  return results
}

// Export functions
module.exports = {
  testConnectivity,
  testAuthentication,
  testMarketDataRefresh,
  testGetMarketData,
  testMarketSummary,
  runManualTests,
}

// Run if executed directly
if (require.main === module) {
  runManualTests().catch(console.error)
}
