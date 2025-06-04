import axios from "axios"
import { authenticator } from "otplib"
import { connectToDatabase } from "../../lib/mongodb"

// Helper function to get IP (simplified for serverless)
const getClientIP = (req) => {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress || "127.0.0.1"
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { db } = await connectToDatabase()

    const API_KEY = process.env.SMARTAPI_KEY
    const CLIENT_CODE = process.env.CLIENT_CODE
    const MPIN = process.env.MPIN
    const TOTP_SECRET = process.env.TOTP_SECRET

    if (!API_KEY || !CLIENT_CODE || !MPIN || !TOTP_SECRET) {
      return res.status(500).json({ error: "Missing required environment variables" })
    }

    // Generate TOTP
    const TOTP = authenticator.generate(TOTP_SECRET)
    console.log("📟 TOTP Generated:", TOTP)

    // Get client IP
    const clientIP = getClientIP(req)
    const publicIP = req.headers["x-real-ip"] || clientIP

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
    await db.collection("auth").findOneAndUpdate(
      { clientCode: CLIENT_CODE },
      {
        ...tokens,
        lastLogin: new Date(),
        isActive: true,
      },
      { upsert: true },
    )

    console.log("🔑 Authentication successful")

    res.status(200).json({
      success: true,
      message: "Authentication successful",
      expiresAt: tokens.expiresAt,
    })
  } catch (error) {
    console.error("❌ Authentication failed:", error.response?.data || error.message)
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message,
    })
  }
}
