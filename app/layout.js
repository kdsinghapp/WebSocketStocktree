const { ThemeProvider } = require("@/components/theme-provider")
const React = require("react")
require("@/app/globals.css")

const metadata = {
  title: "Angel Broking Live Market Data",
  description: "Real-time market data using SmartAPI REST endpoints",
}

function RootLayout({ children }) {
  return React.createElement(
    "html",
    { lang: "en" },
    React.createElement(
      "body",
      null,
      React.createElement(ThemeProvider, { attribute: "class", defaultTheme: "system", enableSystem: true }, children),
    ),
  )
}

module.exports = RootLayout
module.exports.metadata = metadata

// Default export
export default RootLayout
