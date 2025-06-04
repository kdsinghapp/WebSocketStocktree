import { connectToDatabase } from "../../lib/mongodb"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { db } = await connectToDatabase()
    const { exchange, symbol, limit = 50 } = req.query

    const query = {}
    if (exchange) query.exchange = exchange
    if (symbol) query.symbol = symbol

    const data = await db
      .collection("marketdata")
      .find(query)
      .sort({ lastUpdated: -1 })
      .limit(Number.parseInt(limit))
      .toArray()

    res.status(200).json({
      success: true,
      data: data,
      count: data.length,
    })
  } catch (error) {
    console.error("Error fetching market data:", error)
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
}
