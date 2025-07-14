"use client"

import React, { useState } from "react"
import type { ReactNode } from "react"
import { Copy, Check, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from 'rehype-highlight'
import type { Element } from 'hast'
import 'highlight.js/styles/atom-one-dark.css'; // Or your preferred highlight.js theme
import remarkBreaks from "remark-breaks"
import remarkGfm from "remark-gfm" // Import remark-gfm

interface ChatMessageProps {
  message: { 
    role: "user" | "assistant"; 
    content: string | any; // Allow any type but we'll convert to string
    id: string; 
    query?: string 
  }
  inline?: boolean;
}

const ChatMessage = ({ message, inline = false }: ChatMessageProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const [copiedCodeBlock, setCopiedCodeBlock] = useState<string | null>(null)
  
  // Ensure content is always a string
  const messageContent = React.useMemo(() => {
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    // Debug logging for non-string content
    console.warn('Non-string message content detected:', {
      type: typeof message.content,
      content: message.content,
      messageId: message.id,
      role: message.role
    });
    
    // If content is not a string, try to convert it
    if (message.content === null || message.content === undefined) {
      return '';
    }
    
    // If it's an object or array, stringify it
    try {
      return JSON.stringify(message.content, null, 2);
    } catch (error) {
      console.error('Failed to stringify message content:', error);
      return String(message.content);
    }
  }, [message.content]);
  
  // Function to copy code to clipboard
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true)
      setCopiedCodeBlock(code)
      setTimeout(() => {
        setIsCopied(false)
        setCopiedCodeBlock(null)
      }, 2000)
    })
  }
  
  // Check if the message content is an error message
  const isErrorMessage = message.content.includes("error") || 
                         message.content.includes("Error") || 
                         message.content.includes("failed") ||
                         message.content.includes("Failed")

  // Different styling for user vs assistant messages
  if (message.role === "user") {
    return (
      <div className={cn("flex items-start", inline ? "mb-2" : "mb-4")}>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mr-3">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={cn(
          "px-4 py-2 bg-muted rounded-2xl text-sm text-foreground max-w-[85%]",
          inline ? "py-1.5 text-xs" : ""
        )}>
          {message.content}
        </div>
      </div>
    )
  }

  // Define ReactMarkdown components within the ChatMessage component
  // to allow access to props like `onSubTopicSelect` via closure.
  const mdComponents = {
    h1: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props}>{children}</h1>,
    h2: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h2 className="text-xl font-bold mt-5 mb-3" {...props}>{children}</h2>,
    h3: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h3 className="text-lg font-bold mt-4 mb-2" {...props}>{children}</h3>,
    h4: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h4 className="text-base font-bold mt-3 mb-2" {...props}>{children}</h4>,
    h5: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h5 className="text-sm font-bold mt-3 mb-1" {...props}>{children}</h5>,
    h6: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'children'>) => <h6 className="text-xs font-bold mt-3 mb-1" {...props}>{children}</h6>,
    p: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLParagraphElement>, 'children'>) => <p className="mb-4 last:mb-0" {...props}>{children}</p>,
    ul: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLUListElement>, 'children'>) => <ul className="list-disc pl-6 mb-4" {...props}>{children}</ul>,
    ol: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLOListElement>, 'children'>) => <ol className="list-decimal pl-6 mb-4" {...props}>{children}</ol>,
    li: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLLIElement>, 'children'>) => <li className="mb-1" {...props}>{children}</li>,
    a: ({ node, href, children, ...mdProps }: { node?: Element; href?: string; children?: ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'children'>) => {
      return <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" href={href} {...mdProps}>{children}</a>;
    },
    img: ({ node, src, alt, ...props }: { node?: Element; src?: string | Blob; alt?: string } & Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'>) => <img className="max-w-full h-auto my-4 rounded" src={src as string | undefined} alt={alt} {...props} />,
    blockquote: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.BlockquoteHTMLAttributes<HTMLQuoteElement>, 'children'>) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props}>{children}</blockquote>,
    strong: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) => <strong className="font-bold" {...props}>{children}</strong>,
    em: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) => <em className="italic" {...props}>{children}</em>,
    code: ({ node, inline, className, children, ...props }: { node?: Element; inline?: boolean; className?: string; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>) => {
      if (inline) {
        return <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props}>{children}</code>
      }
      
      const codeContent = String(children).replace(/\n$/, '')
      const isCurrentlyCopied = isCopied && copiedCodeBlock === codeContent
      
      return (
        <div className="relative mb-4">
          <pre className="p-4 bg-muted rounded-md overflow-x-auto">
            <code className={className} {...props}>{codeContent}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(codeContent)}
            className="absolute top-2 right-2 p-1 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground"
            aria-label="Copy code"
          >
            {isCurrentlyCopied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      )
    },
    table: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.TableHTMLAttributes<HTMLTableElement>, 'children'>) => <div className="overflow-x-auto mb-4"><table className="min-w-full border-collapse" {...props}>{children}</table></div>,
    thead: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLTableSectionElement>, 'children'>) => <thead className="bg-muted" {...props}>{children}</thead>,
    tbody: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLTableSectionElement>, 'children'>) => <tbody className="divide-y divide-border" {...props}>{children}</tbody>,
    tr: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.HTMLAttributes<HTMLTableRowElement>, 'children'>) => <tr className="border-b border-border" {...props}>{children}</tr>,
    th: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.ThHTMLAttributes<HTMLTableHeaderCellElement>, 'children'>) => <th className="px-4 py-2 text-left font-medium" {...props}>{children}</th>,
    td: ({ node, children, ...props }: { node?: Element; children?: ReactNode } & Omit<React.TdHTMLAttributes<HTMLTableDataCellElement>, 'children'>) => <td className="px-4 py-2" {...props}>{children}</td>,
    hr: ({ node, ...props }: { node?: Element } & Omit<React.HTMLAttributes<HTMLHRElement>, 'children'>) => <hr className="my-6 border-t border-border" {...props} />,
  };

  return (
    <div className={cn("flex items-start", inline ? "mb-2" : "mb-4")}>
      <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mr-3">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className={cn(
        "px-4 py-3 rounded-2xl text-sm bg-card border border-border shadow-sm text-card-foreground max-w-[85%]",
        inline ? "py-2 text-xs" : "",
        isErrorMessage ? "border-red-200 dark:border-red-900" : ""
      )}>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            remarkPlugins={[remarkBreaks, remarkGfm]} // Add remarkGfm here
            components={mdComponents}
          >
            {messageContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

// User icon component
const UserIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

export default ChatMessage