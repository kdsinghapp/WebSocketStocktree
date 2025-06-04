const { createServer } = require("http")
const { Server } = require("socket.io")
const express = require("express")

const app = express()
const httpServer = createServer(app)

// Create a Socket.IO server with CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
})

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  // Handle incoming messages
  socket.on("message", (data) => {
    // Broadcast the message to all clients except the sender
    socket.broadcast.emit("message", data)
  })

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
})

// Start the server
const PORT = process.env.PORT || 3001
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`)
})
