import { NextResponse } from "next/server"
import axios from "axios"
import { authenticator } from "otplib"
import { connectToDatabase } from "../../../../lib/mongodb"

// Helper function to get IP (simplified for serverless)
const getClientIP = (req) => {
  return req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1"
}

export async function POST(req) {
  try {
    console.log("🔐 Starting authentication process...")

    const { db } = await connectToDatabase()
    console.log("✅ MongoDB connected")

    const API_KEY = process.env.SMARTAPI_KEY
    const CLIENT_CODE = process.env.CLIENT_CODE
    const MPIN = process.env.MPIN // Use MPIN instead of PASSWORD
    const TOTP_SECRET = process.env.TOTP_SECRET

    // Check if we should use mock authentication for testing
    const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === "true"

    if (USE_MOCK_AUTH) {
      console.log("🎭 Using mock authentication for testing...")

      // Create mock tokens
      const mockTokens = {
        jwtToken: "mock_jwt_token_" + Date.now(),
        refreshToken: "mock_refresh_token_" + Date.now(),
        feedToken: "mock_feed_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      }

      // Save mock tokens to database
      await db.collection("auth").findOneAndUpdate(
        { clientCode: CLIENT_CODE },
        {
          $set: {
            ...mockTokens,
            lastLogin: new Date(),
            isActive: true,
            isMock: true,
          },
        },
        { upsert: true },
      )

      console.log("🎭 Mock authentication successful!")

      return NextResponse.json({
        success: true,
        message: "Mock authentication successful",
        expiresAt: mockTokens.expiresAt,
        isMock: true,
      })
    }

    // Real authentication with Angel Broking
    if (!API_KEY || !CLIENT_CODE || !MPIN || !TOTP_SECRET) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required environment variables",
        },
        { status: 500 },
      )
    }

    console.log("✅ All environment variables are present")
    console.log("📱 CLIENT_CODE:", CLIENT_CODE.substring(0, 4) + "***")
    console.log("🔑 API_KEY:", API_KEY.substring(0, 8) + "***")

    // Generate TOTP
    const TOTP = authenticator.generate(TOTP_SECRET)
    console.log("📟 TOTP Generated successfully:", TOTP)

    // Get client IP
    const clientIP = getClientIP(req)
    const publicIP = req.headers.get("x-real-ip") || clientIP
    console.log("🌐 Client IP:", clientIP, "Public IP:", publicIP)

    const loginData = {
      clientcode: CLIENT_CODE,
      password: MPIN, // Use MPIN as password
      totp: TOTP,
    }

    const loginConfig = {
      method: "post",
      url: "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": clientIP,
        "X-ClientPublicIP": publicIP,
        "X-MACAddress": "00:0a:95:9d:68:16",
        "X-PrivateKey": API_KEY,
      },
      data: loginData,
      timeout: 30000,
    }

    console.log("📡 Sending login request to Angel Broking...")
    console.log("🔗 URL:", loginConfig.url)
    console.log("📋 Headers:", { ...loginConfig.headers, "X-PrivateKey": "***" })
    console.log("📄 Data:", { ...loginData, password: "***", totp: "***" })

    const loginResponse = await axios(loginConfig)
    console.log("✅ Login response received:", loginResponse.status)
    console.log("📊 Response data:", loginResponse.data)

    if (!loginResponse.data || loginResponse.data.status === false) {
      console.error("❌ Angel Broking API error:", loginResponse.data)
      return NextResponse.json(
        {
          success: false,
          error: `Angel Broking error: ${loginResponse.data?.message || "Unknown error"}`,
          errorCode: loginResponse.data?.errorcode,
        },
        { status: 400 },
      )
    }

    if (!loginResponse.data.data) {
      console.error("❌ Invalid response structure:", loginResponse.data)
      return NextResponse.json(
        {
          success: false,
          error: "Invalid response from Angel Broking API",
        },
        { status: 500 },
      )
    }

    const responseData = loginResponse.data.data
    console.log("📊 Response data keys:", Object.keys(responseData))

    const tokens = {
      jwtToken: responseData.jwtToken,
      refreshToken: responseData.refreshToken,
      feedToken: responseData.feedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }

    if (!tokens.jwtToken || !tokens.feedToken) {
      console.error("❌ Missing tokens in response")
      return NextResponse.json(
        {
          success: false,
          error: "Required tokens not received from Angel Broking",
        },
        { status: 500 },
      )
    }

    console.log("💾 Saving tokens to database...")

    await db.collection("auth").findOneAndUpdate(
      { clientCode: CLIENT_CODE },
      {
        $set: {
          ...tokens,
          lastLogin: new Date(),
          isActive: true,
          isMock: false,
        },
      },
      { upsert: true },
    )

    console.log("🔑 Authentication successful!")

    return NextResponse.json({
      success: true,
      message: "Authentication successful",
      expiresAt: tokens.expiresAt,
    })
  } catch (error) {
    console.error("❌ Authentication failed:", error)

    if (error.response) {
      console.error("📡 Response status:", error.response.status)
      console.error("📡 Response data:", error.response.data)

      return NextResponse.json(
        {
          success: false,
          error: `Angel Broking API error: ${error.response.status} - ${error.response.data?.message || error.response.statusText}`,
          details: error.response.data,
        },
        { status: 500 },
      )
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Network or request error: " + error.message,
        },
        { status: 500 },
      )
    }
  }
}
