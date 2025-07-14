"use client"

import { Button } from "@/components/ui/button"
import { LogOutIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import MobileSidebar from "./mobile-sidebar"
import { Bot } from "lucide-react"

interface ChatHeaderProps {
  user: { name: string; email: string; firstName: string } | null
  onLogout: () => Promise<void> // Updated to indicate server action
  chatHistory?: any[]
  onSelectHistoryEntry?: (id: string) => Promise<void> // Updated to indicate server action
  activeConversationId?: string
}
export default function ChatHeader({
  user,
  onLogout,
  chatHistory = [],
  onSelectHistoryEntry = async () => {},
  activeConversationId,
}: ChatHeaderProps) {
  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  const handleHistorySelect = async (id: string) => {
    try {
      await onSelectHistoryEntry(id);
    } catch (error) {
      console.error('Error selecting history entry:', error);
    }
  };
  return (
    <header className="border-b border-border py-3 px-4 bg-card w-full sticky top-0 z-10 shadow-sm">
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <MobileSidebar
            entries={chatHistory}
            onSelectEntry={handleHistorySelect}
            activeEntryId={activeConversationId}
          />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-sm">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-lg font-medium text-foreground">IT Helpdesk Bot</h1>
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <div className="hidden md:flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shadow-sm">
              <span className="text-muted-foreground font-medium text-xs">{user?.firstName?.charAt(0) || "U"}</span>
            </div>
            <div className="text-sm text-foreground">{user?.firstName}</div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="text-foreground border-border hover:bg-muted hover:text-foreground"
          >
            <LogOutIcon className="h-4 w-4 mr-1" />
            <span className="text-sm">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
