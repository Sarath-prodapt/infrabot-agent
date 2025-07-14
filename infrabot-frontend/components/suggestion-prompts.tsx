"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeftIcon } from "lucide-react"
import SuggestionChip from "./suggestion-chip"

interface SuggestionPromptsProps {
  onPromptClick: (label: string) => void;
  mainTopics: Array<{ label: string }>;
  subTopics?: Array<{ label: string; query?: string }>; // Added
  showSubTopics?: boolean; // Added
  onBackToMainClick?: () => void; // Added for back button
}

export default function SuggestionPrompts({
  onPromptClick,
  mainTopics,
  subTopics,
  showSubTopics = false,
  onBackToMainClick,
}: SuggestionPromptsProps) {
  const itemsToDisplay = showSubTopics && subTopics && subTopics.length > 0 ? subTopics : mainTopics;

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 justify-center">
        {itemsToDisplay.map((item) => (
          <SuggestionChip
            key={item.label}
            text={item.label}
            onClick={() => onPromptClick(item.label)}
          />
        ))}
      </div>
      {showSubTopics && onBackToMainClick && (
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToMainClick}
          className="w-full text-sm flex items-center justify-center mt-2 mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-2" />
          Back to main topics
        </Button>
      )}
    </>
  )
}
