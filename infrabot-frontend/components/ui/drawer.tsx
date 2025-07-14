"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  side?: "left" | "right" | "top" | "bottom"
  className?: string
}

export function Drawer({ children, isOpen, onClose, side = "right", className }: DrawerProps) {
  // Handle ESC key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown)
      // Prevent scrolling when drawer is open
      document.body.style.overflow = "hidden"
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose])

  // Handle clicking outside
  const drawerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick)
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen, onClose])

  // Determine position styles based on side
  const sideStyles = {
    left: "inset-y-0 left-0 h-full max-w-xs w-full transform -translate-x-full",
    right: "inset-y-0 right-0 h-full max-w-xs w-full transform translate-x-full",
    top: "inset-x-0 top-0 w-full max-h-xs h-full transform -translate-y-full",
    bottom: "inset-x-0 bottom-0 w-full max-h-xs h-full transform translate-y-full",
  }

  const openStyles = {
    left: "translate-x-0",
    right: "translate-x-0",
    top: "translate-y-0",
    bottom: "translate-y-0",
  }

  return (
    <div className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed bg-background shadow-xl transition-transform duration-300 ease-in-out",
          sideStyles[side],
          isOpen && openStyles[side],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

export function DrawerContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("h-full flex flex-col overflow-hidden", className)}>{children}</div>
}

export function DrawerHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b border-border flex items-center justify-between", className)}>
      {children}
    </div>
  )
}

export function DrawerBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex-1 overflow-auto p-4", className)}>{children}</div>
}

export function DrawerFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 py-3 border-t border-border", className)}>{children}</div>
}
