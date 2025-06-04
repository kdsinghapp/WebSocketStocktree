import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    const auth = await db.collection("auth").findOne({
      clientCode: process.env.CLIENT_CODE,
    })

    const isAuthenticated =
      auth && auth.jwtToken && auth.isActive && (!auth.expiresAt || new Date() < new Date(auth.expiresAt))

    return NextResponse.json({
      isAuthenticated: isAuthenticated,
      lastLogin: auth?.lastLogin,
      expiresAt: auth?.expiresAt,
    })
  } catch (error) {
    console.error("Error checking auth status:", error)
    return NextResponse.json(
      {
        error: error.message,
        isAuthenticated: false,
      },
      { status: 500 },
    )
  }
}
