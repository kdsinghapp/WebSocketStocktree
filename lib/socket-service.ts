import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export const initializeSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001")

    socket.on("connect", () => {
      console.log("Connected to socket server")
    })

    socket.on("disconnect", () => {
      console.log("Disconnected from socket server")
    })

    socket.on("connect_error", (error) => {
      console.error("Connection error:", error)
    })
  }

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const subscribeToEvent = (event: string, callback: (data: any) => void) => {
  if (!socket) {
    socket = initializeSocket()
  }

  socket.on(event, callback)

  return () => {
    socket?.off(event, callback)
  }
}

export const emitEvent = (event: string, data: any) => {
  if (!socket) {
    socket = initializeSocket()
  }

  socket.emit(event, data)
}
