const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const axios = require("axios")
const { authenticator } = require("otplib")
const os = require("os")
const publicIp = require("public-ip")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/angelbroking", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const db = mongoose.connection
db.on("error", console.error.bind(console, "MongoDB connection error:"))
db.once("open", () => {
  console.log("✅ Connected to MongoDB")
})

// Market Data Schema
const marketDataSchema = new mongoose.Schema(
  {
    token: { type: String, required: true },
    exchange: { type: String, required: true },
    symbol: { type: String, required: true },
    ltp: { type: Number, required: true },
    open: { type: Number },
    high: { type: Number },
    low: { type: Number },
    close: { type: Number },
    volume: { type: Number },
    avgPrice: { type: Number },
    upperCircuit: { type: Number },
    lowerCircuit: { type: Number },
    change: { type: Number },
    changePercent: { type: Number },
    timestamp: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
)

// Create compound index for efficient queries
marketDataSchema.index({ token: 1, exchange: 1, timestamp: -1 })

const MarketData = mongoose.model("MarketData", marketDataSchema)

// Authentication Schema
const authSchema = new mongoose.Schema(
  {
    clientCode: { type: String, required: true, unique: true },
    jwtToken: { type: String },
    refreshToken: { type: String },
    feedToken: { type: String },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
)

const Auth = mongoose.model("Auth", authSchema)

// Stock configuration
const STOCK_CONFIG = {
  NSE: [
    { token: "3045", symbol: "SBIN" },
    { token: "881", symbol: "RELIANCE" },
    { token: "99926004", symbol: "INFY" },
    { token: "2885", symbol: "TCS" },
    { token: "1333", symbol: "HDFCBANK" },
    { token: "17963", symbol: "ITC" },
    { token: "11536", symbol: "LT" },
    { token: "1660", symbol: "KOTAKBANK" },
    { token: "288", symbol: "AXISBANK" },
    { token: "5633", symbol: "MARUTI" },
    { token: "1594", symbol: "ICICIBANK" },
    { token: "10999", symbol: "BHARTIARTL" },
    { token: "526", symbol: "BAJFINANCE" },
    { token: "16675", symbol: "ASIANPAINT" },
    { token: "1330", symbol: "HDFC" },
  ],
  NFO: [{ token: "58662", symbol: "NIFTY_JUN_FUT" }],
}

// Global variables
let authTokens = null
let localIP = null
let publicIPAddress = null

// Helper functions
const getLocalIP = () => {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address
      }
    }
  }
  return "127.0.0.1"
}

const getPublicIP = async () => {
  try {
    return await publicIp.v4()
  } catch (error) {
    console.error("Failed to get public IP:", error)
    return "0.0.0.0"
  }
}

// Initialize IPs
const initializeIPs = async () => {
  localIP = getLocalIP()
  publicIPAddress = await getPublicIP()
  console.log("🏠 Local IP Address:", localIP)
  console.log("🌐 Public IP Address:", publicIPAddress)
}

// Authentication function
const authenticateUser = async () => {
  try {
    const API_KEY = process.env.SMARTAPI_KEY
    const CLIENT_CODE = process.env.CLIENT_CODE
    const MPIN = process.env.MPIN
    const TOTP_SECRET = process.env.TOTP_SECRET

    if (!API_KEY || !CLIENT_CODE || !MPIN || !TOTP_SECRET) {
      throw new Error("Missing required environment variables")
    }

    // Generate TOTP
    const TOTP = authenticator.generate(TOTP_SECRET)
    console.log("📟 TOTP Generated:", TOTP)

    const loginConfig = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": localIP,
        "X-ClientPublicIP": publicIPAddress,
        "X-MACAddress": "00:0a:95:9d:68:16",
        "X-PrivateKey": API_KEY,
      },
      data: {
        clientcode: CLIENT_CODE,
        password: MPIN,
        totp: TOTP,
      },
    }

    const loginResponse = await axios(loginConfig)
    const tokens = {
      jwtToken: loginResponse.data.data.jwtToken,
      refreshToken: loginResponse.data.data.refreshToken,
      feedToken: loginResponse.data.data.feedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }

    // Save to database
    await Auth.findOneAndUpdate(
      { clientCode: CLIENT_CODE },
      {
        ...tokens,
        lastLogin: new Date(),
        isActive: true,
      },
      { upsert: true, new: true },
    )

    authTokens = tokens
    console.log("🔑 Authentication successful")
    return tokens
  } catch (error) {
    console.error("❌ Authentication failed:", error.response?.data || error.message)
    throw error
  }
}

// Fetch market data function
const fetchMarketData = async () => {
  try {
    if (!authTokens || !authTokens.jwtToken) {
      console.log("🔄 No valid tokens, authenticating...")
      await authenticateUser()
    }

    // Prepare quote data exactly as specified
    const quoteData = JSON.stringify({
      mode: "FULL",
      exchangeTokens: {
        NSE: STOCK_CONFIG.NSE.map((stock) => stock.token),
        NFO: STOCK_CONFIG.NFO.map((stock) => stock.token),
      },
    })

    const quoteConfig = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
      headers: {
        "X-PrivateKey": process.env.SMARTAPI_KEY,
        Accept: "application/json",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": localIP,
        "X-ClientPublicIP": publicIPAddress,
        "X-MACAddress": "00:0a:95:9d:68:16",
        "X-UserType": "USER",
        Authorization: `Bearer ${authTokens.jwtToken}`,
        "Content-Type": "application/json",
      },
      data: quoteData,
    }

    console.log("📡 Fetching market data...")
    const response = await axios(quoteConfig)
    const marketData = response.data.data

    // Process and save data to MongoDB
    const savePromises = []

    for (const [exchange, tokens] of Object.entries(marketData)) {
      for (const [token, data] of Object.entries(tokens)) {
        const stockInfo = [...STOCK_CONFIG.NSE, ...STOCK_CONFIG.NFO].find((s) => s.token === token)
        const symbol = stockInfo ? stockInfo.symbol : `TOKEN_${token}`

        const change = data.ltp - data.close
        const changePercent = data.close ? (change / data.close) * 100 : 0

        const marketDataDoc = {
          token: token,
          exchange: exchange,
          symbol: symbol,
          ltp: data.ltp,
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.totalTradedVolume,
          avgPrice: data.avgPrice,
          upperCircuit: data.upperCircuit,
          lowerCircuit: data.lowerCircuit,
          change: change,
          changePercent: changePercent,
          lastUpdated: new Date(),
        }

        savePromises.push(
          MarketData.findOneAndUpdate({ token: token, exchange: exchange }, marketDataDoc, { upsert: true, new: true }),
        )
      }
    }

    await Promise.all(savePromises)
    console.log("💾 Market data saved to MongoDB")
    return marketData
  } catch (error) {
    console.error("❌ Failed to fetch market data:", error.response?.data || error.message)

    // If authentication error, try to re-authenticate
    if (error.response?.status === 401) {
      console.log("🔄 Token expired, re-authenticating...")
      authTokens = null
      await authenticateUser()
      return fetchMarketData() // Retry
    }

    throw error
  }
}

// API Routes

// Get authentication status
app.get("/api/auth/status", async (req, res) => {
  try {
    const auth = await Auth.findOne({ clientCode: process.env.CLIENT_CODE })
    res.json({
      isAuthenticated: !!authTokens,
      lastLogin: auth?.lastLogin,
      expiresAt: auth?.expiresAt,
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Manual authentication endpoint
app.post("/api/auth/login", async (req, res) => {
  try {
    const tokens = await authenticateUser()
    res.json({
      success: true,
      message: "Authentication successful",
      expiresAt: tokens.expiresAt,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Get latest market data
app.get("/api/market/data", async (req, res) => {
  try {
    const { exchange, symbol, limit = 1 } = req.query

    const query = {}
    if (exchange) query.exchange = exchange
    if (symbol) query.symbol = symbol

    const data = await MarketData.find(query).sort({ lastUpdated: -1 }).limit(Number.parseInt(limit))

    res.json({
      success: true,
      data: data,
      count: data.length,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Get historical data for a specific stock
app.get("/api/market/history/:token", async (req, res) => {
  try {
    const { token } = req.params
    const { hours = 24, exchange } = req.query

    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000)

    const query = { token: token, timestamp: { $gte: startTime } }
    if (exchange) query.exchange = exchange

    const data = await MarketData.find(query).sort({ timestamp: 1 })

    res.json({
      success: true,
      data: data,
      count: data.length,
      period: `${hours} hours`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Fetch fresh market data
app.post("/api/market/refresh", async (req, res) => {
  try {
    const data = await fetchMarketData()
    res.json({
      success: true,
      message: "Market data refreshed successfully",
      data: data,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// Get all available stocks
app.get("/api/stocks", (req, res) => {
  res.json({
    success: true,
    stocks: STOCK_CONFIG,
  })
})

// Get market summary
app.get("/api/market/summary", async (req, res) => {
  try {
    const summary = await MarketData.aggregate([
      {
        $group: {
          _id: "$exchange",
          totalStocks: { $sum: 1 },
          avgChange: { $avg: "$changePercent" },
          gainers: {
            $sum: {
              $cond: [{ $gt: ["$changePercent", 0] }, 1, 0],
            },
          },
          losers: {
            $sum: {
              $cond: [{ $lt: ["$changePercent", 0] }, 1, 0],
            },
          },
          lastUpdated: { $max: "$lastUpdated" },
        },
      },
    ])

    res.json({
      success: true,
      summary: summary,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

// WebSocket for real-time updates (optional)
const http = require("http")
const socketIo = require("socket.io")

const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

io.on("connection", (socket) => {
  console.log("📱 Client connected:", socket.id)

  socket.on("subscribe", (tokens) => {
    console.log("📡 Client subscribed to tokens:", tokens)
    socket.join("market-updates")
  })

  socket.on("disconnect", () => {
    console.log("📱 Client disconnected:", socket.id)
  })
})

// Broadcast market data updates
const broadcastMarketData = (data) => {
  io.to("market-updates").emit("marketData", data)
}

// Auto-fetch market data every 30 seconds during market hours
let fetchInterval = null

const startAutoFetch = () => {
  if (fetchInterval) clearInterval(fetchInterval)

  fetchInterval = setInterval(async () => {
    try {
      const now = new Date()
      const hour = now.getHours()
      const day = now.getDay()

      // Only fetch during market hours (9:15 AM to 3:30 PM, Monday to Friday)
      if (day >= 1 && day <= 5 && hour >= 9 && hour <= 15) {
        console.log("⏰ Auto-fetching market data...")
        const data = await fetchMarketData()
        broadcastMarketData(data)
      }
    } catch (error) {
      console.error("❌ Auto-fetch error:", error.message)
    }
  }, 30000) // 30 seconds
}

// Initialize application
const initializeApp = async () => {
  try {
    await initializeIPs()
    await authenticateUser()

    // Start auto-fetch
    startAutoFetch()

    console.log("🚀 Application initialized successfully")
  } catch (error) {
    console.error("❌ Failed to initialize application:", error.message)
  }
}

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  initializeApp()
})

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down gracefully...")
  if (fetchInterval) clearInterval(fetchInterval)
  mongoose.connection.close()
  process.exit(0)
})
