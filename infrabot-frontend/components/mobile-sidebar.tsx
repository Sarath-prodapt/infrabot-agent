"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MenuIcon, X } from "lucide-react"
import ChatHistorySidebar from "@/components/chat-history-sidebar"
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer"

interface ChatHistoryEntry {
  id: string
  query: string
  timestamp: Date
  preview: string
}

interface MobileSidebarProps {
  entries: ChatHistoryEntry[]
  onSelectEntry: (id: string) => Promise<void>
  activeEntryId?: string
}

export default function MobileSidebar({ entries, onSelectEntry, activeEntryId }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleSelectEntry = async (id: string) => {
    await onSelectEntry(id)
    setIsOpen(false)
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(true)}>
        <MenuIcon className="h-5 w-5" />
      </Button>

      <Drawer isOpen={isOpen} onClose={() => setIsOpen(false)} side="left">
        <DrawerContent>
          <DrawerHeader>
            <div className="font-medium">Chat History</div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>
          <div className="h-full overflow-hidden">
            <ChatHistorySidebar entries={entries} onSelectEntry={handleSelectEntry} activeEntryId={activeEntryId} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
