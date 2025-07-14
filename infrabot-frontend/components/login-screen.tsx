"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { LockIcon, UserIcon, WifiIcon, MonitorIcon, KeyIcon, HelpCircleIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface LoginScreenProps {
  onLogin: (userData: { name: string; email: string }) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim()) {
      setError("Please fill in all fields")
      return
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email")
      return
    }

    onLogin({ name, email })
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Theme toggle in the top right corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Login form - full width on mobile, half width on desktop */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-4 md:p-6 order-2 md:order-1">
        <Card className="w-full max-w-md p-6 md:p-8 border-none shadow-xl rounded-xl bg-card/80 backdrop-blur-md">
          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20">
              <LockIcon className="w-7 h-7 text-red-500 dark:text-red-400" />
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl font-semibold text-foreground">IT Helpdesk Bot</h1>
              <p className="text-sm text-muted-foreground">Your IT Department Assistant</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              {error && (
                <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground text-sm h-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground text-sm h-10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-none h-10 text-sm font-medium"
              >
                Login 
              </Button>
            </form>
          </div>
        </Card>
      </div>

      {/* Info section - shown below form on mobile, half width on desktop */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-red-50 to-background dark:from-red-950/20 dark:to-background p-4 md:p-6 flex flex-col justify-center order-1 md:order-2">
        <div className="max-w-md mx-auto">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-4">Your IT Support Assistant</h2>

          <p className="text-sm text-muted-foreground mb-6">
            IT Helpdesk Bot is your company's AI-powered IT assistant, designed to solve common office IT problems quickly and
            efficiently.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
            <div className="flex items-start space-x-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-sm">
              <KeyIcon className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground text-sm">Password Management</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Reset or change your corporate passwords securely with step-by-step guidance.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-sm">
              <WifiIcon className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground text-sm">Network Issues</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Troubleshoot Wi-Fi connectivity, VPN access, and other network-related problems.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-sm">
              <MonitorIcon className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground text-sm">Hardware Support</h3>
                <p className="text-xs text-muted-foreground mt-1">
                   Troubleshoot for hardware issues, or get help with device setup.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 md:p-4 bg-card/80 backdrop-blur-sm rounded-lg shadow-sm">
              <HelpCircleIcon className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground text-sm">Software Assistance</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Get help with software installation, updates, and common application issues.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
