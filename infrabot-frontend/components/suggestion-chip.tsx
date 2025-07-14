

"use client"

interface SuggestionChipProps {
  text: string
  onClick: () => void
}

export default function SuggestionChip({ text, onClick }: SuggestionChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full bg-card shadow-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 text-xs border border-border hover:border-accent transform hover:scale-105 active:scale-95"
    >
      {text}
    </button>
  )
}
