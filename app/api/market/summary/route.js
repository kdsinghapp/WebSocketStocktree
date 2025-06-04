import { NextResponse } from "next/server"
import { connectToDatabase } from "../../../../lib/mongodb"

export async function GET() {
  try {
    const { db } = await connectToDatabase()

    // Get latest data for each stock
    const latestData = await db
      .collection("marketdata")
      .aggregate([
        {
          $sort: { lastUpdated: -1 },
        },
        {
          $group: {
            _id: { token: "$token", exchange: "$exchange" },
            latestRecord: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: { newRoot: "$latestRecord" },
        },
      ])
      .toArray()

    // Calculate summary statistics
    const summary = {
      totalStocks: latestData.length,
      exchanges: {},
      overall: {
        gainers: 0,
        losers: 0,
        unchanged: 0,
        avgChange: 0,
        totalVolume: 0,
      },
    }

    let totalChangePercent = 0

    latestData.forEach((stock) => {
      // Exchange-wise summary
      if (!summary.exchanges[stock.exchange]) {
        summary.exchanges[stock.exchange] = {
          totalStocks: 0,
          gainers: 0,
          losers: 0,
          unchanged: 0,
          avgChange: 0,
          totalVolume: 0,
        }
      }

      const exchangeSummary = summary.exchanges[stock.exchange]
      exchangeSummary.totalStocks++
      exchangeSummary.totalVolume += stock.volume || 0

      // Classify stock movement
      if (stock.changePercent > 0) {
        summary.overall.gainers++
        exchangeSummary.gainers++
      } else if (stock.changePercent < 0) {
        summary.overall.losers++
        exchangeSummary.losers++
      } else {
        summary.overall.unchanged++
        exchangeSummary.unchanged++
      }

      totalChangePercent += stock.changePercent || 0
      summary.overall.totalVolume += stock.volume || 0
    })

    // Calculate average change
    summary.overall.avgChange = latestData.length > 0 ? totalChangePercent / latestData.length : 0

    // Calculate exchange-wise averages
    Object.keys(summary.exchanges).forEach((exchange) => {
      const exchangeData = latestData.filter((stock) => stock.exchange === exchange)
      const exchangeChangeSum = exchangeData.reduce((sum, stock) => sum + (stock.changePercent || 0), 0)
      summary.exchanges[exchange].avgChange = exchangeData.length > 0 ? exchangeChangeSum / exchangeData.length : 0
    })

    // Get last update time
    const lastUpdate =
      latestData.length > 0 ? Math.max(...latestData.map((stock) => new Date(stock.lastUpdated).getTime())) : null

    return NextResponse.json({
      success: true,
      summary: summary,
      lastUpdated: lastUpdate ? new Date(lastUpdate) : null,
      stockData: latestData,
    })
  } catch (error) {
    console.error("Error getting market summary:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
