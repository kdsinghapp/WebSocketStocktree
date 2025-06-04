import "./globals.css"

export const metadata = {
  title: "Angel Broking Live Market Data",
  description: "Real-time market data using SmartAPI REST endpoints",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}
