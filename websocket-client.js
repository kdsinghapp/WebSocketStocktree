const io = require("socket.io-client")

class MarketDataWebSocketClient {
  constructor(serverUrl = "http://localhost:3001") {
    this.serverUrl = serverUrl
    this.socket = null
    this.isConnected = false
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl)

      this.socket.on("connect", () => {
        console.log("✅ Connected to market data server")
        this.isConnected = true
        resolve()
      })

      this.socket.on("disconnect", () => {
        console.log("❌ Disconnected from market data server")
        this.isConnected = false
      })

      this.socket.on("connect_error", (error) => {
        console.error("❌ Connection error:", error)
        reject(error)
      })

      this.socket.on("marketData", (data) => {
        console.log("📊 Received market data update:", Object.keys(data))
        this.onMarketDataUpdate(data)
      })
    })
  }

  subscribe(tokens = []) {
    if (this.isConnected) {
      this.socket.emit("subscribe", tokens)
      console.log("📡 Subscribed to tokens:", tokens)
    } else {
      console.error("❌ Not connected to server")
    }
  }

  onMarketDataUpdate(data) {
    // Override this method to handle market data updates
    console.log("📈 Market data update received")

    // Example: Process each exchange and token
    for (const [exchange, tokens] of Object.entries(data)) {
      for (const [token, marketData] of Object.entries(tokens)) {
        console.log(`${exchange}:${token} - LTP: ₹${marketData.ltp}`)
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.isConnected = false
      console.log("🔌 Disconnected from server")
    }
  }
}

// Example usage
async function exampleWebSocket() {
  const client = new MarketDataWebSocketClient()

  // Override the market data handler
  client.onMarketDataUpdate = (data) => {
    console.log("📊 Custom market data handler:")

    for (const [exchange, tokens] of Object.entries(data)) {
      console.log(`\n📈 ${exchange} Exchange:`)

      for (const [token, marketData] of Object.entries(tokens)) {
        const change = marketData.ltp - marketData.close
        const changePercent = ((change / marketData.close) * 100).toFixed(2)
        const arrow = change >= 0 ? "📈" : "📉"

        console.log(`  ${arrow} Token ${token}: ₹${marketData.ltp} (${changePercent}%)`)
      }
    }
  }

  try {
    await client.connect()

    // Subscribe to all available tokens
    const tokens = ["3045", "881", "99926004", "2885", "1333"]
    client.subscribe(tokens)

    // Keep the connection alive
    console.log("🔄 Listening for market data updates... Press Ctrl+C to exit")
  } catch (error) {
    console.error("❌ WebSocket example error:", error)
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleWebSocket()
}

module.exports = MarketDataWebSocketClient
