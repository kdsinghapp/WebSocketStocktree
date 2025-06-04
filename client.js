const axios = require("axios")

const BASE_URL = "http://localhost:3001"

class AngelBrokingClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl
  }

  // Get authentication status
  async getAuthStatus() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/auth/status`)
      return response.data
    } catch (error) {
      console.error("Error getting auth status:", error.message)
      throw error
    }
  }

  // Manual login
  async login() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`)
      return response.data
    } catch (error) {
      console.error("Error logging in:", error.message)
      throw error
    }
  }

  // Get latest market data
  async getMarketData(exchange = null, symbol = null, limit = 50) {
    try {
      const params = new URLSearchParams()
      if (exchange) params.append("exchange", exchange)
      if (symbol) params.append("symbol", symbol)
      if (limit) params.append("limit", limit)

      const response = await axios.get(`${this.baseUrl}/api/market/data?${params}`)
      return response.data
    } catch (error) {
      console.error("Error getting market data:", error.message)
      throw error
    }
  }

  // Get historical data
  async getHistoricalData(token, hours = 24, exchange = null) {
    try {
      const params = new URLSearchParams()
      if (hours) params.append("hours", hours)
      if (exchange) params.append("exchange", exchange)

      const response = await axios.get(`${this.baseUrl}/api/market/history/${token}?${params}`)
      return response.data
    } catch (error) {
      console.error("Error getting historical data:", error.message)
      throw error
    }
  }

  // Refresh market data
  async refreshMarketData() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/market/refresh`)
      return response.data
    } catch (error) {
      console.error("Error refreshing market data:", error.message)
      throw error
    }
  }

  // Get available stocks
  async getStocks() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/stocks`)
      return response.data
    } catch (error) {
      console.error("Error getting stocks:", error.message)
      throw error
    }
  }

  // Get market summary
  async getMarketSummary() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/market/summary`)
      return response.data
    } catch (error) {
      console.error("Error getting market summary:", error.message)
      throw error
    }
  }
}

// Example usage
async function example() {
  const client = new AngelBrokingClient()

  try {
    // Check authentication status
    console.log("🔍 Checking auth status...")
    const authStatus = await client.getAuthStatus()
    console.log("Auth Status:", authStatus)

    // Get latest market data
    console.log("📊 Getting market data...")
    const marketData = await client.getMarketData("NSE", null, 10)
    console.log("Market Data:", marketData)

    // Get market summary
    console.log("📈 Getting market summary...")
    const summary = await client.getMarketSummary()
    console.log("Market Summary:", summary)

    // Get historical data for RELIANCE
    console.log("📉 Getting historical data for RELIANCE...")
    const historical = await client.getHistoricalData("881", 6, "NSE")
    console.log("Historical Data:", historical)
  } catch (error) {
    console.error("Example error:", error.message)
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  example()
}

module.exports = AngelBrokingClient
