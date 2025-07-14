"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircleIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ChatHistoryEntry {
  id: string
  query: string
  timestamp: Date
  preview: string
}

interface ChatHistorySidebarProps {
  entries: ChatHistoryEntry[]
  onSelectEntry: (id: string) => Promise<void>
  activeEntryId?: string
}

export default function ChatHistorySidebar({ entries, onSelectEntry, activeEntryId }: ChatHistorySidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`border-r border-border bg-muted flex flex-col h-full transition-all duration-300 ease-in-out ${
        collapsed ? "w-12" : "w-full md:w-80"
      }`}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h2 className="font-medium text-foreground flex items-center">
            <MessageCircleIcon className="h-4 w-4 mr-2" />
            Chat History
          </h2>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${collapsed ? "mx-auto" : ""}`}
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </Button>
      </div>

      {!collapsed && (
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[calc(100vh-8rem)]">
            {entries.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No chat history yet</div>
            ) : (
              <div className="p-2">
                {entries.map((entry) => (
                  <Button
                    key={entry.id}
                    variant="ghost"
                    className={`w-full justify-start text-left p-3 mb-1 h-auto ${
                      activeEntryId === entry.id ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => onSelectEntry(entry.id)}
                  >
                    <div className="flex flex-col w-full">
                      <div className="font-medium text-sm text-foreground break-words line-clamp-2">{entry.query}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
