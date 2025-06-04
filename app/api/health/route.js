import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../lib/mongodb"

export async function GET() {
  const healthCheck = {
    timestamp: new Date().toISOString(),
    status: "OK",
    services: {},
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSmartApiKey: !!process.env.SMARTAPI_KEY,
      hasClientCode: !!process.env.CLIENT_CODE,
      hasMpin: !!process.env.MPIN,
      hasTotpSecret: !!process.env.TOTP_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI,
    },
  }

  // Test MongoDB connection
  try {
    const { db } = await connectToDatabase()
    await db.admin().ping()
    healthCheck.services.mongodb = {
      status: "connected",
      message: "MongoDB connection successful",
    }
  } catch (error) {
    healthCheck.services.mongodb = {
      status: "error",
      message: error.message,
    }
    healthCheck.status = "DEGRADED"
  }

  // Test Angel Broking API connectivity (basic check)
  try {
    const response = await fetch("https://apiconnect.angelone.in", {
      method: "HEAD",
      timeout: 5000,
    })
    healthCheck.services.angelBroking = {
      status: response.ok ? "reachable" : "unreachable",
      message: `Angel Broking API ${response.ok ? "is reachable" : "returned " + response.status}`,
    }
  } catch (error) {
    healthCheck.services.angelBroking = {
      status: "error",
      message: "Cannot reach Angel Broking API: " + error.message,
    }
  }

  const statusCode = healthCheck.status === "OK" ? 200 : 503

  return NextResponse.json(healthCheck, { status: statusCode })
}
