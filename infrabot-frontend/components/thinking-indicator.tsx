"use client"

import { Bot } from "lucide-react"

export default function ThinkingIndicator() {
  return (
    <div className="flex items-start">
      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mr-3">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl text-sm bg-card border border-border shadow-sm flex items-center">
        <div className="bouncing-loader">
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </div>
  )
}
