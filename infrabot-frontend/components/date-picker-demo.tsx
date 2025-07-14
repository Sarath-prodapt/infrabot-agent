"use client"

import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DatePickerDemo() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Schedule IT Support</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Select Appointment Date</label>
          <DatePicker value={selectedDate} onChange={setSelectedDate} placeholder="Select a date..." />
        </div>

        {selectedDate && (
          <div className="p-3 bg-muted rounded-md text-sm">
            You selected: <span className="font-medium">{selectedDate.toLocaleDateString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
