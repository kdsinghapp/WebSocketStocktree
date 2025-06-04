import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/mongodb"

export async function GET(request) {
  try {
    const { db } = await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const exchange = searchParams.get("exchange")
    const symbol = searchParams.get("symbol")
    const limit = Number.parseInt(searchParams.get("limit")) || 50

    const query = {}
    if (exchange) query.exchange = exchange
    if (symbol) query.symbol = symbol

    const data = await db.collection("marketdata").find(query).sort({ lastUpdated: -1 }).limit(limit).toArray()

    return NextResponse.json({
      success: true,
      data: data,
      count: data.length,
    })
  } catch (error) {
    console.error("Error fetching market data:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
