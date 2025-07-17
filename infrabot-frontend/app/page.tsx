"use client"

import { useState } from "react"
import LoginScreen from "../components/login-screen"
import ChatInterface from "../components/chat-interface"
import { ThemeProvider } from "../components/theme-provider"

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<{ name: string; email: string; firstName: string } | null>(null)

  const handleLogin = (userData: { name: string; email: string }) => {
    const firstName = userData.name.split(" ")[0]
    setUser({ ...userData, firstName })
    setIsLoggedIn(true)
  }

  const handleLogout = async (): Promise<void> => {
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <ThemeProvider defaultTheme="system">
      <main className="h-screen overflow-hidden">
        {!isLoggedIn ? <LoginScreen onLogin={handleLogin} /> : <ChatInterface user={user} onLogout={handleLogout} />}
      </main>
    </ThemeProvider>
  )
}
