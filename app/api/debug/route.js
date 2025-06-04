import { NextResponse } from "next/server"

export async function GET() {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    environmentVariables: {
      SMARTAPI_KEY: process.env.SMARTAPI_KEY ? "✅ Set" : "❌ Missing",
      CLIENT_CODE: process.env.CLIENT_CODE ? "✅ Set" : "❌ Missing",
      PASSWORD: process.env.PASSWORD ? "✅ Set" : "❌ Missing",
      MPIN: process.env.MPIN ? "✅ Set" : "❌ Missing",
      TOTP_SECRET: process.env.TOTP_SECRET ? "✅ Set" : "❌ Missing",
      MONGODB_URI: process.env.MONGODB_URI ? "✅ Set" : "❌ Missing",
      // Show partial values for debugging (first 4 chars + ***)
      SMARTAPI_KEY_PREVIEW: process.env.SMARTAPI_KEY ? process.env.SMARTAPI_KEY.substring(0, 4) + "***" : "Not set",
      CLIENT_CODE_PREVIEW: process.env.CLIENT_CODE ? process.env.CLIENT_CODE.substring(0, 4) + "***" : "Not set",
      PASSWORD_SET: process.env.PASSWORD ? "Yes" : "No",
      MPIN_SET: process.env.MPIN ? "Yes" : "No",
    },
    angelBrokingEndpoint: "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
  }

  return NextResponse.json(debugInfo)
}
