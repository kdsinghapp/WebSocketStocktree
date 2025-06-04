"use client"

const { useState, useEffect } = require("react")
const { Card, CardContent, CardHeader, CardTitle, CardDescription } = require("@/components/ui/card")
const { Button } = require("@/components/ui/button")
const { Tabs, TabsContent, TabsList, TabsTrigger } = require("@/components/ui/tabs")
const { ScrollArea } = require("@/components/ui/scroll-area")
const { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } = require("@/components/ui/table")
const { Badge } = require("@/components/ui/badge")
const { ArrowUpIcon, ArrowDownIcon, RefreshCw, TrendingUp, TrendingDown, Activity } = require("lucide-react")
const React = require("react")

function LiveMarketData() {
  const [marketData, setMarketData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Check authentication status on load
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Auto-refresh functionality
  useEffect(() => {
    let interval = null
    if (autoRefresh && isAuthenticated) {
      interval = setInterval(() => {
        fetchMarketData()
      }, 30000) // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, isAuthenticated])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/status")
      const data = await response.json()
      setIsAuthenticated(data.isAuthenticated)
    } catch (error) {
      console.error("Error checking auth status:", error)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (data.success) {
        setIsAuthenticated(true)
        console.log("✅ Login successful")
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
      console.error("❌ Login failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch fresh data
      const refreshResponse = await fetch("/api/market/refresh", {
        method: "POST",
      })

      if (!refreshResponse.ok) {
        throw new Error("Failed to refresh market data")
      }

      // Get latest data
      const dataResponse = await fetch("/api/market/data?limit=20")
      const dataResult = await dataResponse.json()

      if (dataResult.success) {
        setMarketData(dataResult.data)
        setLastUpdated(new Date())
      }

      // Get summary
      const summaryResponse = await fetch("/api/market/summary")
      const summaryResult = await summaryResponse.json()

      if (summaryResult.success) {
        setSummary(summaryResult.summary)
      }

      console.log("📊 Market data fetched successfully")
    } catch (err) {
      setError(err.message)
      console.error("❌ Failed to fetch market data:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(price)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-IN").format(num)
  }

  return React.createElement(
    "div",
    { className: "container mx-auto p-4 space-y-6" },
    React.createElement(
      "div",
      { className: "text-center" },
      React.createElement("h1", { className: "text-3xl font-bold mb-2" }, "Angel Broking Live Market Data"),
      React.createElement(
        "p",
        { className: "text-muted-foreground" },
        "Real-time market data using SmartAPI with MongoDB storage",
      ),
    ),
    error &&
      React.createElement(
        Card,
        { className: "border-red-200 bg-red-50" },
        React.createElement(
          CardContent,
          { className: "pt-6" },
          React.createElement("p", { className: "text-red-600" }, error),
        ),
      ),
    React.createElement(
      Tabs,
      { defaultValue: "dashboard", className: "w-full" },
      React.createElement(
        TabsList,
        { className: "grid w-full grid-cols-3" },
        React.createElement(TabsTrigger, { value: "dashboard" }, "Dashboard"),
        React.createElement(TabsTrigger, { value: "data" }, "Market Data"),
        React.createElement(TabsTrigger, { value: "auth" }, "Authentication"),
      ),
      React.createElement(
        TabsContent,
        { value: "dashboard", className: "space-y-4" },
        summary &&
          React.createElement(
            "div",
            { className: "grid grid-cols-1 md:grid-cols-3 gap-4" },
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Total Stocks"),
                React.createElement(Activity, { className: "h-4 w-4 text-muted-foreground" }),
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement("div", { className: "text-2xl font-bold" }, summary.totalStocks),
                React.createElement("p", { className: "text-xs text-muted-foreground" }, "Across all exchanges"),
              ),
            ),
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Gainers"),
                React.createElement(TrendingUp, { className: "h-4 w-4 text-green-600" }),
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement("div", { className: "text-2xl font-bold text-green-600" }, summary.overall.gainers),
                React.createElement("p", { className: "text-xs text-muted-foreground" }, "Stocks in green"),
              ),
            ),
            React.createElement(
              Card,
              null,
              React.createElement(
                CardHeader,
                { className: "flex flex-row items-center justify-between space-y-0 pb-2" },
                React.createElement(CardTitle, { className: "text-sm font-medium" }, "Losers"),
                React.createElement(TrendingDown, { className: "h-4 w-4 text-red-600" }),
              ),
              React.createElement(
                CardContent,
                null,
                React.createElement("div", { className: "text-2xl font-bold text-red-600" }, summary.overall.losers),
                React.createElement("p", { className: "text-xs text-muted-foreground" }, "Stocks in red"),
              ),
            ),
          ),
        summary &&
          React.createElement(
            Card,
            null,
            React.createElement(CardHeader, null, React.createElement(CardTitle, null, "Exchange Summary")),
            React.createElement(
              CardContent,
              null,
              React.createElement(
                "div",
                { className: "space-y-4" },
                Object.entries(summary.exchanges).map(([exchange, data]) =>
                  React.createElement(
                    "div",
                    { key: exchange, className: "flex justify-between items-center p-4 border rounded-lg" },
                    React.createElement(
                      "div",
                      null,
                      React.createElement("h3", { className: "font-bold" }, exchange),
                      React.createElement(
                        "p",
                        { className: "text-sm text-muted-foreground" },
                        data.totalStocks,
                        " stocks",
                      ),
                    ),
                    React.createElement(
                      "div",
                      { className: "text-right" },
                      React.createElement(
                        "div",
                        { className: `font-bold ${data.avgChange >= 0 ? "text-green-600" : "text-red-600"}` },
                        data.avgChange.toFixed(2),
                        "%",
                      ),
                      React.createElement(
                        "div",
                        { className: "text-sm text-muted-foreground" },
                        "↑ ",
                        data.gainers,
                        " ↓ ",
                        data.losers,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ),
      React.createElement(
        TabsContent,
        { value: "data", className: "space-y-4" },
        React.createElement(
          Card,
          null,
          React.createElement(
            CardHeader,
            null,
            React.createElement(
              "div",
              { className: "flex justify-between items-center" },
              React.createElement(CardTitle, null, "Live Market Data"),
              React.createElement(
                "div",
                { className: "flex items-center gap-2" },
                React.createElement(
                  "label",
                  { className: "flex items-center gap-2 text-sm" },
                  React.createElement("input", {
                    type: "checkbox",
                    checked: autoRefresh,
                    onChange: (e) => setAutoRefresh(e.target.checked),
                  }),
                  "Auto-refresh (30s)",
                ),
                React.createElement(
                  Button,
                  { variant: "outline", size: "sm", onClick: fetchMarketData, disabled: loading || !isAuthenticated },
                  React.createElement(RefreshCw, { className: `h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}` }),
                  "Refresh",
                ),
              ),
            ),
            lastUpdated &&
              React.createElement(CardDescription, null, "Last updated: ", lastUpdated.toLocaleTimeString()),
          ),
          React.createElement(
            CardContent,
            null,
            !isAuthenticated
              ? React.createElement(
                  "div",
                  { className: "text-center py-8 text-muted-foreground" },
                  "Please authenticate first to view market data",
                )
              : marketData.length === 0
                ? React.createElement(
                    "div",
                    { className: "text-center py-8 text-muted-foreground" },
                    "No data available. Click Refresh to fetch market data.",
                  )
                : React.createElement(
                    ScrollArea,
                    { className: "h-[600px]" },
                    React.createElement(
                      Table,
                      null,
                      React.createElement(
                        TableHeader,
                        null,
                        React.createElement(
                          TableRow,
                          null,
                          React.createElement(TableHead, null, "Symbol"),
                          React.createElement(TableHead, null, "LTP"),
                          React.createElement(TableHead, null, "Change"),
                          React.createElement(TableHead, { className: "hidden md:table-cell" }, "Open"),
                          React.createElement(TableHead, { className: "hidden md:table-cell" }, "High"),
                          React.createElement(TableHead, { className: "hidden md:table-cell" }, "Low"),
                          React.createElement(TableHead, { className: "hidden md:table-cell" }, "Volume"),
                        ),
                      ),
                      React.createElement(
                        TableBody,
                        null,
                        marketData.map((stock) => {
                          const isPositive = stock.change >= 0

                          return React.createElement(
                            TableRow,
                            { key: `${stock.exchange}-${stock.token}` },
                            React.createElement(
                              TableCell,
                              null,
                              React.createElement("div", { className: "font-medium" }, stock.symbol),
                              React.createElement(
                                "div",
                                { className: "text-xs text-muted-foreground" },
                                stock.exchange,
                              ),
                            ),
                            React.createElement(TableCell, { className: "font-medium" }, formatPrice(stock.ltp)),
                            React.createElement(
                              TableCell,
                              null,
                              React.createElement(
                                "div",
                                { className: `flex items-center ${isPositive ? "text-green-600" : "text-red-600"}` },
                                isPositive
                                  ? React.createElement(ArrowUpIcon, { className: "h-3 w-3 mr-1" })
                                  : React.createElement(ArrowDownIcon, { className: "h-3 w-3 mr-1" }),
                                React.createElement("span", null, formatPrice(Math.abs(stock.change))),
                              ),
                              React.createElement(
                                "div",
                                { className: `text-xs ${isPositive ? "text-green-600" : "text-red-600"}` },
                                stock.changePercent.toFixed(2),
                                "%",
                              ),
                            ),
                            React.createElement(
                              TableCell,
                              { className: "hidden md:table-cell" },
                              formatPrice(stock.open),
                            ),
                            React.createElement(
                              TableCell,
                              { className: "hidden md:table-cell" },
                              formatPrice(stock.high),
                            ),
                            React.createElement(
                              TableCell,
                              { className: "hidden md:table-cell" },
                              formatPrice(stock.low),
                            ),
                            React.createElement(
                              TableCell,
                              { className: "hidden md:table-cell" },
                              formatNumber(stock.volume),
                            ),
                          )
                        }),
                      ),
                    ),
                  ),
          ),
        ),
      ),
      React.createElement(
        TabsContent,
        { value: "auth", className: "space-y-4" },
        React.createElement(
          Card,
          null,
          React.createElement(
            CardHeader,
            null,
            React.createElement(CardTitle, null, "Authentication"),
            React.createElement(CardDescription, null, "Authenticate with Angel Broking SmartAPI"),
          ),
          React.createElement(
            CardContent,
            { className: "space-y-4" },
            React.createElement(
              "div",
              { className: `p-4 rounded-lg ${isAuthenticated ? "bg-green-50" : "bg-yellow-50"}` },
              React.createElement(
                "p",
                { className: `font-medium ${isAuthenticated ? "text-green-600" : "text-yellow-600"}` },
                isAuthenticated ? "✅ Authenticated" : "⚠️ Not Authenticated",
              ),
              React.createElement(
                "p",
                { className: "text-sm text-muted-foreground" },
                isAuthenticated ? "You can now fetch live market data" : "Please authenticate to access market data",
              ),
            ),
            React.createElement(
              Button,
              {
                onClick: handleLogin,
                disabled: loading || isAuthenticated,
                className: "w-full",
              },
              loading ? "Authenticating..." : isAuthenticated ? "Already Authenticated" : "Authenticate with SmartAPI",
            ),
          ),
        ),
      ),
    ),
  )
}

module.exports = LiveMarketData
export default LiveMarketData
