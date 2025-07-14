"use client"

import type React from "react"

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
}

export default function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl hover:bg-muted transition-all duration-200 transform hover:scale-105 active:scale-95 hover:shadow-md"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center shadow-sm">
        <div className="text-red-500 dark:text-red-400">{icon}</div>
      </div>
      <span className="text-sm text-foreground font-medium text-center">{label}</span>
    </button>
  )
}
