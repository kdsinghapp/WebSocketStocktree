const axios = require("axios")

// Configuration
const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"

class APITester {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl
    this.results = []
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, message, type }
    this.results.push(logEntry)

    const emoji = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
    }

    console.log(`${emoji[type]} [${timestamp}] ${message}`)
  }

  async testEndpoint(method, endpoint, data = null, expectedStatus = 200) {
    try {
      this.log(`Testing ${method.toUpperCase()} ${endpoint}`)

      const config = {
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        timeout: 30000, // 30 seconds timeout
      }

      if (data) {
        config.data = data
        config.headers = { "Content-Type": "application/json" }
      }

      const response = await axios(config)

      if (response.status === expectedStatus) {
        this.log(`✓ ${endpoint} - Status: ${response.status}`, "success")
        return { success: true, data: response.data, status: response.status }
      } else {
        this.log(`✗ ${endpoint} - Expected: ${expectedStatus}, Got: ${response.status}`, "warning")
        return { success: false, data: response.data, status: response.status }
      }
    } catch (error) {
      this.log(`✗ ${endpoint} - Error: ${error.message}`, "error")
      if (error.response) {
        this.log(`Response Status: ${error.response.status}`, "error")
        this.log(`Response Data: ${JSON.stringify(error.response.data)}`, "error")
      }
      return { success: false, error: error.message, status: error.response?.status }
    }
  }

  async runAllTests() {
    this.log("🚀 Starting API Tests", "info")
    this.log(`Base URL: ${this.baseUrl}`, "info")

    const tests = [
      // Test 1: Check authentication status
      {
        name: "Authentication Status",
        method: "GET",
        endpoint: "/api/auth/status",
        expectedStatus: 200,
      },

      // Test 2: Login to Angel Broking
      {
        name: "Angel Broking Login",
        method: "POST",
        endpoint: "/api/auth/login",
        expectedStatus: 200,
      },

      // Test 3: Get market data (should be empty initially)
      {
        name: "Get Market Data",
        method: "GET",
        endpoint: "/api/market/data",
        expectedStatus: 200,
      },

      // Test 4: Refresh market data (fetch from Angel Broking)
      {
        name: "Refresh Market Data",
        method: "POST",
        endpoint: "/api/market/refresh",
        expectedStatus: 200,
      },

      // Test 5: Get market data again (should have data now)
      {
        name: "Get Market Data (After Refresh)",
        method: "GET",
        endpoint: "/api/market/data?limit=5",
        expectedStatus: 200,
      },

      // Test 6: Get market summary
      {
        name: "Market Summary",
        method: "GET",
        endpoint: "/api/market/summary",
        expectedStatus: 200,
      },
    ]

    const results = {}

    for (const test of tests) {
      this.log(`\n📋 Running Test: ${test.name}`, "info")
      const result = await this.testEndpoint(test.method, test.endpoint, test.data, test.expectedStatus)
      results[test.name] = result

      // Add delay between tests
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    this.log("\n📊 Test Summary:", "info")
    let passed = 0
    let failed = 0

    for (const [testName, result] of Object.entries(results)) {
      if (result.success) {
        this.log(`✅ ${testName}: PASSED`, "success")
        passed++
      } else {
        this.log(`❌ ${testName}: FAILED`, "error")
        failed++
      }
    }

    this.log(`\n🎯 Results: ${passed} passed, ${failed} failed`, passed === tests.length ? "success" : "warning")

    return results
  }

  async testSpecificStock(token = "881", exchange = "NSE") {
    this.log(`\n🔍 Testing specific stock: ${token} (${exchange})`, "info")

    try {
      // First ensure we have data
      await this.testEndpoint("POST", "/api/market/refresh")

      // Get specific stock data
      const result = await this.testEndpoint("GET", `/api/market/data?exchange=${exchange}&limit=20`)

      if (result.success && result.data.data) {
        const stockData = result.data.data.find((stock) => stock.token === token)

        if (stockData) {
          this.log(`📈 Found stock data for ${token}:`, "success")
          this.log(`   Symbol: ${stockData.symbol}`, "info")
          this.log(`   LTP: ₹${stockData.ltp}`, "info")
          this.log(`   Change: ₹${stockData.change} (${stockData.changePercent.toFixed(2)}%)`, "info")
          this.log(`   Volume: ${stockData.volume}`, "info")
          return stockData
        } else {
          this.log(`❌ No data found for token ${token}`, "error")
          return null
        }
      }
    } catch (error) {
      this.log(`❌ Error testing specific stock: ${error.message}`, "error")
      return null
    }
  }

  async testDataFreshness() {
    this.log("\n⏰ Testing data freshness", "info")

    try {
      const result = await this.testEndpoint("GET", "/api/market/data?limit=1")

      if (result.success && result.data.data && result.data.data.length > 0) {
        const latestData = result.data.data[0]
        const lastUpdated = new Date(latestData.lastUpdated)
        const now = new Date()
        const ageMinutes = (now - lastUpdated) / (1000 * 60)

        this.log(`📅 Latest data timestamp: ${lastUpdated.toISOString()}`, "info")
        this.log(`⏱️ Data age: ${ageMinutes.toFixed(1)} minutes`, "info")

        if (ageMinutes < 5) {
          this.log("✅ Data is fresh (< 5 minutes old)", "success")
        } else if (ageMinutes < 30) {
          this.log("⚠️ Data is somewhat old (5-30 minutes)", "warning")
        } else {
          this.log("❌ Data is stale (> 30 minutes old)", "error")
        }

        return { age: ageMinutes, timestamp: lastUpdated }
      } else {
        this.log("❌ No data available to check freshness", "error")
        return null
      }
    } catch (error) {
      this.log(`❌ Error checking data freshness: ${error.message}`, "error")
      return null
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      totalTests: this.results.length,
      logs: this.results,
    }

    return report
  }
}

// CLI usage
async function runTests() {
  const tester = new APITester()

  console.log("🧪 Angel Broking API Test Suite")
  console.log("================================\n")

  try {
    // Run all basic tests
    await tester.runAllTests()

    // Test specific stock
    await tester.testSpecificStock("881", "NSE") // RELIANCE
    await tester.testSpecificStock("3045", "NSE") // SBIN

    // Test data freshness
    await tester.testDataFreshness()

    // Generate report
    const report = tester.generateReport()
    console.log("\n📋 Full Test Report:")
    console.log(JSON.stringify(report, null, 2))
  } catch (error) {
    console.error("❌ Test suite failed:", error.message)
  }
}

// Export for use in other files
module.exports = APITester

// Run tests if this file is executed directly
if (require.main === module) {
  runTests()
}
