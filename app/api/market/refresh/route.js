import { NextResponse } from "next/server"
import axios from "axios"
import { connectToDatabase } from "../../../../lib/mongodb"

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

// Mock market data for testing
const generateMockMarketData = () => {
  const mockData = {}

  // Generate mock NSE data
  mockData.NSE = {}
  STOCK_CONFIG.NSE.forEach((stock) => {
    const basePrice = Math.random() * 1000 + 100 // Random price between 100-1100
    const change = (Math.random() - 0.5) * 20 // Random change between -10 to +10

    mockData.NSE[stock.token] = {
      ltp: Number.parseFloat((basePrice + change).toFixed(2)),
      open: Number.parseFloat(basePrice.toFixed(2)),
      high: Number.parseFloat((basePrice + Math.abs(change) + Math.random() * 10).toFixed(2)),
      low: Number.parseFloat((basePrice - Math.abs(change) - Math.random() * 10).toFixed(2)),
      close: Number.parseFloat(basePrice.toFixed(2)),
      totalTradedVolume: Math.floor(Math.random() * 1000000),
      avgPrice: Number.parseFloat((basePrice + change / 2).toFixed(2)),
      upperCircuit: Number.parseFloat((basePrice * 1.1).toFixed(2)),
      lowerCircuit: Number.parseFloat((basePrice * 0.9).toFixed(2)),
    }
  })

  // Generate mock NFO data
  mockData.NFO = {}
  STOCK_CONFIG.NFO.forEach((stock) => {
    const basePrice = Math.random() * 500 + 50
    const change = (Math.random() - 0.5) * 10

    mockData.NFO[stock.token] = {
      ltp: Number.parseFloat((basePrice + change).toFixed(2)),
      open: Number.parseFloat(basePrice.toFixed(2)),
      high: Number.parseFloat((basePrice + Math.abs(change) + Math.random() * 5).toFixed(2)),
      low: Number.parseFloat((basePrice - Math.abs(change) - Math.random() * 5).toFixed(2)),
      close: Number.parseFloat(basePrice.toFixed(2)),
      totalTradedVolume: Math.floor(Math.random() * 100000),
      avgPrice: Number.parseFloat((basePrice + change / 2).toFixed(2)),
      upperCircuit: Number.parseFloat((basePrice * 1.1).toFixed(2)),
      lowerCircuit: Number.parseFloat((basePrice * 0.9).toFixed(2)),
    }
  })

  return mockData
}

const getClientIP = (req) => {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
}

export async function POST(req) {
  try {
    const { db } = await connectToDatabase()

    // Get authentication tokens
    const auth = await db.collection("auth").findOne({
      clientCode: process.env.CLIENT_CODE,
      isActive: true,
    })

    if (!auth || !auth.jwtToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid authentication tokens found. Please login first.",
        },
        { status: 401 },
      )
    }

    // Check if using mock authentication
    if (auth.isMock || process.env.USE_MOCK_AUTH === "true") {
      console.log("🎭 Using mock market data...")

      const mockMarketData = generateMockMarketData()

      // Process and save mock data to MongoDB
      const savePromises = []

      for (const [exchange, tokens] of Object.entries(mockMarketData)) {
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
            timestamp: new Date(),
            isMock: true,
          }

          savePromises.push(
            db
              .collection("marketdata")
              .findOneAndUpdate({ token: token, exchange: exchange }, { $set: marketDataDoc }, { upsert: true }),
          )
        }
      }

      await Promise.all(savePromises)
      console.log("🎭 Mock market data saved to MongoDB")

      return NextResponse.json({
        success: true,
        message: "Mock market data refreshed successfully",
        data: mockMarketData,
        timestamp: new Date(),
        isMock: true,
      })
    }

    // Real market data fetching (existing code)
    // Check if token is expired
    if (auth.expiresAt && new Date() > new Date(auth.expiresAt)) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication token expired. Please login again.",
        },
        { status: 401 },
      )
    }

    // Get client IP
    const clientIP = getClientIP(req)
    const publicIP = req.headers.get("x-real-ip") || clientIP

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
        "X-ClientLocalIP": clientIP,
        "X-ClientPublicIP": publicIP,
        "X-MACAddress": "00:0a:95:9d:68:16",
        "X-UserType": "USER",
        Authorization: `Bearer ${auth.jwtToken}`,
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
          timestamp: new Date(),
          isMock: false,
        }

        savePromises.push(
          db
            .collection("marketdata")
            .findOneAndUpdate({ token: token, exchange: exchange }, { $set: marketDataDoc }, { upsert: true }),
        )
      }
    }

    await Promise.all(savePromises)
    console.log("💾 Market data saved to MongoDB")

    return NextResponse.json({
      success: true,
      message: "Market data refreshed successfully",
      data: marketData,
      timestamp: new Date(),
    })
  } catch (error) {
    console.error("❌ Failed to fetch market data:", error.response?.data || error.message)

    if (error.response?.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication failed. Please login again.",
        },
        { status: 401 },
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: error.response?.data?.message || error.message,
        },
        { status: 500 },
      )
    }
  }
}
