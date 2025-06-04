class AngelWebSocketClient {
  constructor() {
    this.ws = null
    this.isConnected = false
    this.subscriptions = new Set()
    this.heartbeatInterval = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.onDataCallback = null
    this.onErrorCallback = null
    this.onConnectCallback = null
    this.onDisconnectCallback = null
  }

  connect(authData) {
    const { jwtToken, feedToken, apiKey, clientCode } = authData

    if (!jwtToken || !feedToken || !apiKey || !clientCode) {
      throw new Error("Missing required authentication data")
    }

    // For browser clients, use query parameters
    const wsUrl = `wss://smartapisocket.angelone.in/smart-stream?clientCode=${clientCode}&feedToken=${feedToken}&apiKey=${apiKey}`

    console.log("🔌 Connecting to Angel Broking WebSocket...")

    this.ws = new WebSocket(wsUrl)

    // Set up event handlers
    this.ws.onopen = () => {
      console.log("✅ WebSocket connected to Angel Broking")
      this.isConnected = true
      this.reconnectAttempts = 0
      this.startHeartbeat()

      if (this.onConnectCallback) {
        this.onConnectCallback()
      }
    }

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data)
    }

    this.ws.onclose = (event) => {
      console.log("❌ WebSocket disconnected:", event.code, event.reason)
      this.isConnected = false
      this.stopHeartbeat()

      if (this.onDisconnectCallback) {
        this.onDisconnectCallback(event)
      }

      // Auto-reconnect logic
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        setTimeout(() => {
          this.connect(authData)
        }, 5000 * this.reconnectAttempts) // Exponential backoff
      }
    }

    this.ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback(error)
      }
    }
  }

  startHeartbeat() {
    // Send ping every 30 seconds as required by Angel Broking
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send("ping")
        console.log("💓 Heartbeat sent")
      }
    }, 30000)
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  handleMessage(data) {
    if (typeof data === "string") {
      if (data === "pong") {
        console.log("💓 Heartbeat response received")
        return
      }

      // Handle JSON error responses
      try {
        const jsonData = JSON.parse(data)
        if (jsonData.errorCode) {
          console.error("❌ WebSocket error:", jsonData)
          if (this.onErrorCallback) {
            this.onErrorCallback(jsonData)
          }
          return
        }
      } catch (e) {
        // Not JSON, ignore
      }
    } else {
      // Handle binary market data
      this.parseBinaryData(data)
    }
  }

  parseBinaryData(buffer) {
    try {
      const dataView = new DataView(buffer)
      let offset = 0

      // Parse according to Angel Broking's binary format
      const subscriptionMode = dataView.getUint8(offset)
      offset += 1

      const exchangeType = dataView.getUint8(offset)
      offset += 1

      // Token (25 bytes, null-terminated string)
      const tokenBytes = new Uint8Array(buffer, offset, 25)
      let tokenStr = ""
      for (let i = 0; i < 25; i++) {
        if (tokenBytes[i] === 0) break
        tokenStr += String.fromCharCode(tokenBytes[i])
      }
      offset += 25

      const sequenceNumber = dataView.getBigUint64(offset, true) // Little endian
      offset += 8

      const exchangeTimestamp = dataView.getBigUint64(offset, true)
      offset += 8

      const ltp = dataView.getUint32(offset, true) / 100 // Convert from paise to rupees
      offset += 8

      const marketData = {
        subscriptionMode,
        exchangeType,
        token: tokenStr,
        sequenceNumber: Number(sequenceNumber),
        exchangeTimestamp: Number(exchangeTimestamp),
        ltp,
        timestamp: new Date(),
      }

      // Parse additional fields based on subscription mode
      if (subscriptionMode >= 2) {
        // Quote mode - parse additional fields
        const lastTradedQuantity = dataView.getBigUint64(offset, true)
        offset += 8
        const avgTradedPrice = dataView.getBigUint64(offset, true) / 100
        offset += 8
        const volumeTraded = dataView.getBigUint64(offset, true)
        offset += 8

        Object.assign(marketData, {
          lastTradedQuantity: Number(lastTradedQuantity),
          avgTradedPrice,
          volumeTraded: Number(volumeTraded),
        })
      }

      if (subscriptionMode === 3) {
        // Snap Quote mode - parse even more fields
        // Add more fields as needed
      }

      console.log("📊 Market data received:", marketData)

      if (this.onDataCallback) {
        this.onDataCallback(marketData)
      }
    } catch (error) {
      console.error("❌ Error parsing binary data:", error)
    }
  }

  subscribe(tokens, mode = 1) {
    if (!this.isConnected) {
      console.error("❌ WebSocket not connected")
      return
    }

    // Group tokens by exchange type
    const tokensByExchange = {}

    tokens.forEach((token) => {
      const exchangeType = token.exchangeType || 1 // Default to NSE
      if (!tokensByExchange[exchangeType]) {
        tokensByExchange[exchangeType] = []
      }
      tokensByExchange[exchangeType].push(token.token)
    })

    // Create subscription request
    const subscriptionRequest = {
      correlationID: this.generateCorrelationId(),
      action: 1, // Subscribe
      params: {
        mode: mode, // 1=LTP, 2=Quote, 3=SnapQuote
        tokenList: Object.entries(tokensByExchange).map(([exchangeType, tokenList]) => ({
          exchangeType: Number.parseInt(exchangeType),
          tokens: tokenList,
        })),
      },
    }

    console.log("📡 Subscribing to tokens:", subscriptionRequest)
    this.ws.send(JSON.stringify(subscriptionRequest))

    // Track subscriptions
    tokens.forEach((token) => {
      this.subscriptions.add(`${token.exchangeType}-${token.token}-${mode}`)
    })
  }

  unsubscribe(tokens, mode = 1) {
    if (!this.isConnected) {
      console.error("❌ WebSocket not connected")
      return
    }

    // Similar to subscribe but with action: 0
    const tokensByExchange = {}

    tokens.forEach((token) => {
      const exchangeType = token.exchangeType || 1
      if (!tokensByExchange[exchangeType]) {
        tokensByExchange[exchangeType] = []
      }
      tokensByExchange[exchangeType].push(token.token)
    })

    const unsubscriptionRequest = {
      correlationID: this.generateCorrelationId(),
      action: 0, // Unsubscribe
      params: {
        mode: mode,
        tokenList: Object.entries(tokensByExchange).map(([exchangeType, tokenList]) => ({
          exchangeType: Number.parseInt(exchangeType),
          tokens: tokenList,
        })),
      },
    }

    console.log("📡 Unsubscribing from tokens:", unsubscriptionRequest)
    this.ws.send(JSON.stringify(unsubscriptionRequest))

    // Remove from tracked subscriptions
    tokens.forEach((token) => {
      this.subscriptions.delete(`${token.exchangeType}-${token.token}-${mode}`)
    })
  }

  generateCorrelationId() {
    return Math.random().toString(36).substring(2, 12)
  }

  disconnect() {
    console.log("🔌 Disconnecting WebSocket...")
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
    }
    this.isConnected = false
    this.subscriptions.clear()
  }

  // Event handlers
  onConnect(callback) {
    this.onConnectCallback = callback
  }

  onDisconnect(callback) {
    this.onDisconnectCallback = callback
  }

  onData(callback) {
    this.onDataCallback = callback
  }

  onError(callback) {
    this.onErrorCallback = callback
  }
}

export default AngelWebSocketClient
