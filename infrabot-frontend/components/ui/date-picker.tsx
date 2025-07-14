"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  className?: string
  placeholder?: string
}

export function DatePicker({ value, onChange, className, placeholder = "Select date..." }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(value || new Date())
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  // Handle clicking outside to close
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick)
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [isOpen])

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get day of week for first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  // Navigate to next month
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  // Check if a date is the selected date
  const isSelectedDate = (date: Date) => {
    return (
      value &&
      date.getDate() === value.getDate() &&
      date.getMonth() === value.getMonth() &&
      date.getFullYear() === value.getFullYear()
    )
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Handle date selection
  const handleDateSelect = (date: Date) => {
    onChange(date)
    setIsOpen(false)
  }

  // Generate calendar days
  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const daysInMonth = getDaysInMonth(year, month)
    const firstDayOfMonth = getFirstDayOfMonth(year, month)

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push(
        <Button
          key={`day-${day}`}
          type="button"
          variant={isSelectedDate(date) ? "default" : "ghost"}
          className={cn(
            "h-8 w-8 p-0 font-normal",
            isToday(date) && !isSelectedDate(date) && "border border-red-500 text-red-500",
            isSelectedDate(date) && "bg-red-500 text-white hover:bg-red-600",
          )}
          onClick={() => handleDateSelect(date)}
        >
          {day}
        </Button>,
      )
    }

    return days
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="flex items-center relative" onClick={() => setIsOpen(!isOpen)}>
        <Input readOnly value={formatDate(value)} placeholder={placeholder} className="pr-10 cursor-pointer" />
        <Calendar className="absolute right-3 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full max-w-[280px] rounded-md border border-border bg-card shadow-md">
          <div className="p-3">
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-2">
              <Button type="button" variant="ghost" className="h-7 w-7 p-0" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-medium">
                {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </div>
              <Button type="button" variant="ghost" className="h-7 w-7 p-0" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center text-xs text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>
          </div>

          {/* Footer with today button */}
          <div className="border-t border-border p-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => {
                const today = new Date()
                handleDateSelect(today)
                setCurrentMonth(today)
              }}
            >
              Today
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
