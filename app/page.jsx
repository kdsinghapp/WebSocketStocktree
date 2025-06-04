"use client"

import { useState, useEffect } from "react"
import { ArrowUpIcon, ArrowDownIcon, RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react"

// Simple UI Components (inline to avoid import issues)
const Card = ({ children, className = "" }) => (
  <div className={`rounded-lg border bg-white text-gray-900 shadow-sm ${className}`}>{children}</div>
)

const CardHeader = ({ children, className = "" }) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`}>{children}</div>
)

const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
)

const CardDescription = ({ children, className = "" }) => (
  <p className={`text-sm text-gray-600 ${className}`}>{children}</p>
)

const CardContent = ({ children, className = "" }) => <div className={`p-6 pt-0 ${className}`}>{children}</div>

const Button = ({ children, onClick, disabled = false, variant = "default", size = "default", className = "" }) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 hover:text-gray-900",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
  }

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

const Tabs = ({ children, defaultValue, className = "" }) => {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <div className={className}>
      {children.map((child, index) => {
        if (child.type.name === "TabsList") {
          return { ...child, key: index, props: { ...child.props, activeTab, setActiveTab } }
        }
        if (child.type.name === "TabsContent") {
          return { ...child, key: index, props: { ...child.props, activeTab } }
        }
        return child
      })}
    </div>
  )
}

const TabsList = ({ children, className = "", activeTab, setActiveTab }) => (
  <div className={`inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-600 ${className}`}>
    {children.map((child, index) => ({
      ...child,
      key: index,
      props: { ...child.props, activeTab, setActiveTab },
    }))}
  </div>
)

const TabsTrigger = ({ children, value, activeTab, setActiveTab }) => (
  <button
    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
      activeTab === value ? "bg-white text-gray-900 shadow-sm" : "hover:bg-white/50"
    }`}
    onClick={() => setActiveTab(value)}
  >
    {children}
  </button>
)

const TabsContent = ({ children, value, activeTab, className = "" }) => {
  if (activeTab !== value) return null

  return (
    <div
      className={`mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  )
}

const ScrollArea = ({ children, className = "" }) => (
  <div className={`relative overflow-auto ${className}`} style={{ scrollbarWidth: "thin" }}>
    {children}
  </div>
)

const Table = ({ children, className = "" }) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className}`}>{children}</table>
  </div>
)

const TableHeader = ({ children, className = "" }) => <thead className={`${className}`}>{children}</thead>

const TableBody = ({ children, className = "" }) => <tbody className={`${className}`}>{children}</tbody>

const TableRow = ({ children, className = "" }) => (
  <tr className={`border-b transition-colors hover:bg-gray-50 ${className}`}>{children}</tr>
)

const TableHead = ({ children, className = "" }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-gray-600 ${className}`}>{children}</th>
)

const TableCell = ({ children, className = "" }) => <td className={`p-4 align-middle ${className}`}>{children}</td>

export default function LiveMarketData() {
  const [marketData, setMarketData] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [debugInfo, setDebugInfo] = useState(null)

  const testAPIConnectivity = async () => {
    try {
      console.log("🔍 Testing API connectivity...")

      // Test basic API
      const testResponse = await fetch("/api/test")
      if (testResponse.ok) {
        console.log("✅ Basic API test passed")
      } else {
        console.log("❌ Basic API test failed:", testResponse.status)
      }

      // Test health check
      const healthResponse = await fetch("/api/health")
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        console.log("✅ Health check passed:", healthData)
      } else {
        console.log("❌ Health check failed:", healthResponse.status)
      }

      // Get debug info
      const debugResponse = await fetch("/api/debug")
      if (debugResponse.ok) {
        const debugData = await debugResponse.json()
        console.log("🔧 Debug info:", debugData)
        setDebugInfo(debugData)
      }
    } catch (error) {
      console.log("❌ API connectivity test failed:", error.message)
    }
  }

  // Check authentication status on load
  useEffect(() => {
    testAPIConnectivity()
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
      if (!response.ok) {
        console.log("Auth status endpoint not found or error:", response.status)
        setIsAuthenticated(false)
        return
      }
      const data = await response.json()
      setIsAuthenticated(data.isAuthenticated)
    } catch (error) {
      console.error("Error checking auth status:", error)
      setIsAuthenticated(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("🔐 Starting login process...")

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("📡 Login response status:", response.status)

      const data = await response.json()
      console.log("📊 Login response data:", data)

      if (response.ok && data.success) {
        setIsAuthenticated(true)
        setError(null)
        console.log("✅ Login successful")
      } else {
        const errorMessage = data.error || `Login failed with status ${response.status}`
        setError(errorMessage)
        console.error("❌ Login failed:", errorMessage)

        // Show additional details if available
        if (data.details) {
          console.error("📋 Error details:", data.details)
        }
      }
    } catch (err) {
      const errorMessage = `Login error: ${err.message}`
      setError(errorMessage)
      console.error("❌ Login failed:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarketData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Check if refresh endpoint exists
      const refreshResponse = await fetch("/api/market/refresh", {
        method: "POST",
      })

      if (!refreshResponse.ok) {
        throw new Error(`Refresh failed: ${refreshResponse.status} ${refreshResponse.statusText}`)
      }

      // Get latest data
      const dataResponse = await fetch("/api/market/data?limit=20")
      if (!dataResponse.ok) {
        throw new Error(`Data fetch failed: ${dataResponse.status} ${dataResponse.statusText}`)
      }

      const dataResult = await dataResponse.json()

      if (dataResult.success) {
        setMarketData(dataResult.data)
        setLastUpdated(new Date())
      }

      // Get summary
      const summaryResponse = await fetch("/api/market/summary")
      if (summaryResponse.ok) {
        const summaryResult = await summaryResponse.json()
        if (summaryResult.success) {
          setSummary(summaryResult.summary)
        }
      }

      console.log("📊 Market data fetched successfully")
    } catch (err) {
      setError(`Market data error: ${err.message}`)
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

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-7xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 text-gray-900">Angel Broking Live Market Data</h1>
        <p className="text-gray-600">Real-time market data using SmartAPI with MongoDB storage</p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="auth" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="data">Market Data</TabsTrigger>
        </TabsList>

        <TabsContent value="auth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Authenticate with Angel Broking SmartAPI</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`p-4 rounded-lg ${isAuthenticated ? "bg-green-50" : "bg-yellow-50"}`}>
                <p className={`font-medium ${isAuthenticated ? "text-green-600" : "text-yellow-600"}`}>
                  {isAuthenticated ? "✅ Authenticated" : "⚠️ Not Authenticated"}
                </p>
                <p className="text-sm text-gray-600">
                  {isAuthenticated ? "You can now fetch live market data" : "Please authenticate to access market data"}
                </p>
              </div>
              <Button onClick={handleLogin} disabled={loading || isAuthenticated} className="w-full">
                {loading
                  ? "Authenticating..."
                  : isAuthenticated
                    ? "Already Authenticated"
                    : "Authenticate with SmartAPI"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>System status and environment variables</CardDescription>
            </CardHeader>
            <CardContent>
              {debugInfo ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Environment Variables:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(debugInfo.environmentVariables).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-mono">{key}:</span>
                          <span className={value.includes("✅") ? "text-green-600" : "text-red-600"}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">API Endpoint:</h4>
                    <p className="text-sm font-mono bg-gray-100 p-2 rounded">{debugInfo.angelBrokingEndpoint}</p>
                  </div>
                  <Button variant="secondary" onClick={testAPIConnectivity} className="w-full">
                    Refresh Debug Info
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Loading debug information...</p>
                  <Button variant="outline" onClick={testAPIConnectivity}>
                    Load Debug Info
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stocks</CardTitle>
                  <Activity className="h-4 w-4 text-gray-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.totalStocks}</div>
                  <p className="text-xs text-gray-600">Across all exchanges</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gainers</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{summary.overall.gainers}</div>
                  <p className="text-xs text-gray-600">Stocks in green</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Losers</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{summary.overall.losers}</div>
                  <p className="text-xs text-gray-600">Stocks in red</p>
                </CardContent>
              </Card>
            </div>
          )}

          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Exchange Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(summary.exchanges).map(([exchange, data]) => (
                    <div key={exchange} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <h3 className="font-bold">{exchange}</h3>
                        <p className="text-sm text-gray-600">{data.totalStocks} stocks</p>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${data.avgChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {data.avgChange.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-600">
                          ↑ {data.gainers} ↓ {data.losers}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Live Market Data</CardTitle>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Auto-refresh (30s)
                  </label>
                  <Button variant="outline" size="sm" onClick={fetchMarketData} disabled={loading || !isAuthenticated}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
              {lastUpdated && <CardDescription>Last updated: {lastUpdated.toLocaleTimeString()}</CardDescription>}
            </CardHeader>
            <CardContent>
              {!isAuthenticated ? (
                <div className="text-center py-8 text-gray-600">Please authenticate first to view market data</div>
              ) : marketData.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  No data available. Click Refresh to fetch market data.
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>LTP</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead className="hidden md:table-cell">Open</TableHead>
                        <TableHead className="hidden md:table-cell">High</TableHead>
                        <TableHead className="hidden md:table-cell">Low</TableHead>
                        <TableHead className="hidden md:table-cell">Volume</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marketData.map((stock) => {
                        const isPositive = stock.change >= 0

                        return (
                          <TableRow key={`${stock.exchange}-${stock.token}`}>
                            <TableCell>
                              <div className="font-medium">{stock.symbol}</div>
                              <div className="text-xs text-gray-600">{stock.exchange}</div>
                            </TableCell>
                            <TableCell className="font-medium">{formatPrice(stock.ltp)}</TableCell>
                            <TableCell>
                              <div className={`flex items-center ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                {isPositive ? (
                                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                                ) : (
                                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                                )}
                                <span>{formatPrice(Math.abs(stock.change))}</span>
                              </div>
                              <div className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                {stock.changePercent.toFixed(2)}%
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{formatPrice(stock.open)}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatPrice(stock.high)}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatPrice(stock.low)}</TableCell>
                            <TableCell className="hidden md:table-cell">{formatNumber(stock.volume)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
