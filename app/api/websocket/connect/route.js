import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/mongodb"

export async function POST(req) {
  try {
    const { db } = await connectToDatabase()

    // Get authentication tokens from database
    const auth = await db.collection("auth").findOne({
      clientCode: process.env.CLIENT_CODE,
      isActive: true,
    })

    if (!auth || !auth.jwtToken || !auth.feedToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid authentication tokens found. Please login first.",
        },
        { status: 401 },
      )
    }

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

    // Return WebSocket connection data
    return NextResponse.json({
      success: true,
      websocketUrl: "wss://smartapisocket.angelone.in/smart-stream",
      authData: {
        jwtToken: auth.jwtToken,
        feedToken: auth.feedToken,
        apiKey: process.env.SMARTAPI_KEY,
        clientCode: process.env.CLIENT_CODE,
      },
      message: "WebSocket connection data ready",
    })
  } catch (error) {
    console.error("❌ Failed to get WebSocket connection data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
