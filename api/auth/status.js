import { connectToDatabase } from "../../lib/mongodb"

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const { db } = await connectToDatabase()

    const auth = await db.collection("auth").findOne({
      clientCode: process.env.CLIENT_CODE,
    })

    const isAuthenticated =
      auth && auth.jwtToken && auth.isActive && (!auth.expiresAt || new Date() < new Date(auth.expiresAt))

    res.status(200).json({
      isAuthenticated: isAuthenticated,
      lastLogin: auth?.lastLogin,
      expiresAt: auth?.expiresAt,
    })
  } catch (error) {
    console.error("Error checking auth status:", error)
    res.status(500).json({
      error: error.message,
      isAuthenticated: false,
    })
  }
}
