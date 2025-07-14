"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  SendIcon,
  FileTextIcon,
  HardDriveIcon,
  ShieldIcon,
  WifiIcon,
  MonitorIcon,
  KeyIcon,
  Bot,
  } from "lucide-react"
import ChatMessage from "@/components/chat-message"
import ChatHeader from "@/components/chat-header"
import ActionButton from "@/components/action-button"
import ThinkingIndicator from "@/components/thinking-indicator"
import ChatHistorySidebar from "@/components/chat-history-sidebar"
import SuggestionPrompts from "@/components/suggestion-prompts"

interface ChatInterfaceProps {
  user: { name: string; email: string; firstName: string } | null
  onLogout: () => Promise<void> // Updated for type consistency
}

// Interface for chat history entries
interface ChatHistoryEntry {
  id: string
  query: string
  timestamp: Date
  preview: string
}

// Interface for sub-topic items, allowing for nesting
interface SubTopicItem {
  label: string;
  query?: string; // query is optional, defaults to label
  subTopics?: SubTopicItem[]; // Allows for nested sub-topics
}

// Interface for action button configuration
interface ActionButtonConfig {
  icon: React.ReactNode
  label: string
  subTopics?: SubTopicItem[]
}

export default function ChatInterface({ user, onLogout }: ChatInterfaceProps) {
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; id: string; query?: string }>
  >([])
  const [isThinking, setIsThinking] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [currentQuery, setCurrentQuery] = useState("")
  const [hasInteracted, setHasInteracted] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined)
  const [currentActionSubTopics, setCurrentActionSubTopics] = useState<SubTopicItem[] | null>(null)
  const [isSubTopicSelectionViewActive, setIsSubTopicSelectionViewActive] = useState(false)
  const [subTopicPathStack, setSubTopicPathStack] = useState<string[]>([]) // New state for parent sub-topic path

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const actionButtons: ActionButtonConfig[] = [
    {
      icon: <KeyIcon className="h-5 w-5" />,
      label: "Password Help",
      subTopics: [
        { label: "I forgot my password" },
        {
          label: "How to change password",
          subTopics: [
            { label: "I am in office connected to Prodapt Network" },
            { label: "I am working remotely" },
          ],
        },
        { label: "My password is expired" },
        { label: "Account Locked out" },
      ],
    },
    {
      icon: <WifiIcon className="h-5 w-5" />,
      label: "Network Issues",
      subTopics: [
        {
          label: "VPN connection error",
          subTopics: [
            { label: "“Login failed“" },
            { label: "“The VPN connection failed due to unsuccessful domain name resolution“" },
            { label: "“Login denied your environment does not meet the access criteria defined by your administrator“" },
          ],
        },
      ],
    },
    { icon: <FileTextIcon className="h-5 w-5" />, 
      label: "HelpDesk Ticket",
      subTopics: [
        { label: "How to raise Helpdesk Ticket" },
        { 
          label: "What is the Ticket category ?",
          subTopics: [
            { 
              label: "Software",
              subTopics: [
                { label: "Installation",
                  subTopics: [
                    { label: "Licensed software" },
                    { label: "Opensource software" },
                    { label: "Install configured software" },
                    { label: "VoIP License" },
                  ]
                 },
                { label: "Upgrade"},
                { label: "Issues with software" },
              ]
            },
            { 
              label: "Hardware",
              subTopics: [
                { label: "Issues with Prodapt devices",
                  subTopics: [
                    { label: "Laptop" },
                    { label: "Desktop" },
                    { label: "Printer" },
                    { label: "Headphones" },
                    { label: "Wireless Mouse" },
                    { label: "Monitor" },
                  ]
                 },
                { label: "Hardware upgrade",
                  subTopics: [
                    { label: "RAM " },
                    { label: "SSD " },
                  ]
                 },
                { label: "Request for Peripherals",
                  subTopics: [
                    { label: "Monitor" },
                    { label: "Keyboard" },
                    { label: "Mouse" },
                    { label: "Datacard" },
                    { label: "Headphones" },
                  ]
                 },
              ]
            },
            { label: "Network",
              subTopics: [
                { label: "Network Issues",
                  subTopics: [
                    { label: "Internet " },
                    { label: "VPN " },
                    { label: "WiFi " },
                    { label: "LAN " },
                  ]
                },
                { label: "Network Provisioning",
                  subTopics: [
                    { label: "Forti Token" },
                    { label: "VPN" },
                    { label: "WiFi/LAN" },
                  ]
                 },

              ]
             },
            { label: "Security and Permissions request",
              subTopics: [
                { label: "Admin Rights" },
                { label: "USB Access" },
                { label: "DLP Exception" },
                { label: "VAPT Scan"},

              ]
             },
          ]
        }
      ]
    },
   
    { icon: <MonitorIcon className="h-5 w-5" />, label: "Software Help" },
    {
      icon: <HardDriveIcon className="h-5 w-5" />,
      label: "Hardware Issues",
      subTopics: [
        {
          label: "Laptop Issue",
          subTopics: [
            {
              label: "My laptop wont turn on",
              subTopics: [
                { label: "Surface" },
                { label: "Lenovo" },
                { label: "Other" },
              ],
            },
            { label: "Keyboard issue" },
          ],
        },
      ],
    },
    { icon: <ShieldIcon className="h-5 w-5" />, label: "Security Help" },
  ]

  useEffect(() => {
    scrollToBottom()
  }, [messages, isThinking])

  useEffect(() => {
    // Focus the input field when the component mounts
    if (inputRef.current && !hasInteracted) {
      inputRef.current.focus()
    }
  }, [hasInteracted])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Function to add a new entry to chat history
  const addToChatHistory = (prompt: string, response: string) => {
    const newEntry: ChatHistoryEntry = {
      id: Date.now().toString(),
      query: prompt, // Changed from prompt to query to match ChatHistorySidebar's expected type
      timestamp: new Date(),
      preview: "", // We're not using the preview anymore
    }

    setChatHistory((prev) => [newEntry, ...prev])
    setActiveConversationId(newEntry.id)
  }

  const processAIResponse = async (promptQuery: string) => {
    setCurrentQuery(promptQuery)
    setIsThinking(true)
    // setInput("") // Clear input after sending - moved to handlers
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptQuery }),
      })

      if (!response.ok) {
        // Try to parse error message from backend
        let errorMsg = "An error occurred."
        try {
          const errorData = await response.json()
          errorMsg = errorData.error || errorData.detail || errorMsg
        } catch (e) {
          console.error("Failed to parse error response:", e)
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg, id: Date.now().toString() },
        ])
        setIsThinking(false)
        return
      }
      if (!response.body) {
        throw new Error('Response body is null')
      }
      setIsThinking(false)
      setIsTyping(true)
      setCurrentResponse("") // Reset current response for the new stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedResponse = ""
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }
        const chunk = decoder.decode(value, { stream: true })
        
        // Ensure chunk is a string
        const chunkStr = typeof chunk === 'string' ? chunk : String(chunk)
        accumulatedResponse += chunkStr
        setCurrentResponse(prev => prev + chunkStr)
        scrollToBottom()
      }
      
      setIsTyping(false)
      
      // Ensure the final message content is a string
      const finalContent = typeof accumulatedResponse === 'string' ? accumulatedResponse : String(accumulatedResponse)
      
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: finalContent, id: Date.now().toString() },
      ])
      setCurrentResponse("")
      setCurrentQuery("")
      addToChatHistory(promptQuery, finalContent)
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setIsThinking(false);
      setIsTyping(false);
      setCurrentQuery("");

      // Error message handling
      let errorMessage = "An error occurred while processing your request. Please try again.";
      if (error instanceof Error) {
        // Extract status code if it's a fetch error
        const match = error.message.match(/^API request failed with status (\d+)$/);
        if (match) {
          const status = parseInt(match[1]);
          if (status === 400) {
            errorMessage = "Invalid request. Please check your input and try again.";
          } else if (status === 429) {
            errorMessage = "Too many requests. Please wait a moment and try again.";
          } else if (status >= 500) {
            errorMessage = "Server error. Please try again later.";
          }
        }
      }

      setMessages((prevMessages) => [
        ...prevMessages,
        {
          role: 'assistant',
          content: errorMessage,
          id: Date.now().toString(),
        },
      ]);
    }
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const query = input.trim()
    setHasInteracted(true)
    setIsSubTopicSelectionViewActive(false) // Typing a message overrides sub-topic view
    setSubTopicPathStack([]) // Clear path when typing a new message
    setCurrentActionSubTopics(null)
    // Add the user's message here, as processAIResponse is now only for AI interaction
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", content: query, id: Date.now().toString() + "-user-send" },
    ]);
    processAIResponse(query)
    setInput("")
  }

  const handleMainActionClick = (buttonConfig: ActionButtonConfig) => {
    setHasInteracted(true)
    setInput("") // Clear input when an action is clicked

    if (buttonConfig.subTopics && buttonConfig.subTopics.length > 0) {
      setCurrentActionSubTopics(buttonConfig.subTopics)
      setSubTopicPathStack([]) // Reset path when a new main action is chosen
      setIsSubTopicSelectionViewActive(true)
      // Sub-topics will be shown in SuggestionPrompts, no message added here.
    } else {
      setIsSubTopicSelectionViewActive(false)
      setSubTopicPathStack([])
      setCurrentActionSubTopics(null)
      // Add user message for the action itself before processing
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: buttonConfig.label, id: Date.now().toString() + "-user-action" },
      ])
      processAIResponse(buttonConfig.label)
    }
  }

  const handleSubTopicClick = (clickedSubTopic: SubTopicItem) => {
    // hasInteracted should already be true

    if (clickedSubTopic.subTopics && clickedSubTopic.subTopics.length > 0) {
      // This sub-topic has further sub-topics, display them
      setSubTopicPathStack(prevStack => [...prevStack, clickedSubTopic.label]);
      setCurrentActionSubTopics(clickedSubTopic.subTopics);
      setIsSubTopicSelectionViewActive(true); // Keep sub-topic view active
    } else {
      // This is a leaf sub-topic, process it
      const leafQuery = clickedSubTopic.query || clickedSubTopic.label;
      const fullQuery = subTopicPathStack.length > 0
        ? `${subTopicPathStack.join(": ")}: ${leafQuery}`
        : leafQuery;

      // Add user message for the selected sub-topic
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "user", content: fullQuery, id: Date.now().toString() + "-user-subtopic" },
      ]);

      processAIResponse(fullQuery);
      setIsSubTopicSelectionViewActive(false); // Done with sub-topics for now
      setCurrentActionSubTopics(null);
      setSubTopicPathStack([]); // Reset path after processing leaf
    }
    // setInput("") // Input is already cleared by handleMainActionClick or handleSendMessage
  }

  const handleBackToMainTopics = () => {
    setIsSubTopicSelectionViewActive(false);
    setCurrentActionSubTopics(null);
    setSubTopicPathStack([]); // Clear path when going back to main topics
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectHistoryEntry = async (id: string): Promise<void> => { // Updated for type consistency
    setActiveConversationId(id)
    // In a real app, you would load the conversation associated with this ID
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Always show the header */}
      <ChatHeader
        user={user}
        onLogout={onLogout}
        chatHistory={chatHistory}
        onSelectHistoryEntry={handleSelectHistoryEntry}
        activeConversationId={activeConversationId}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Always show the chat history sidebar on desktop */}
        <div className="hidden md:block h-[calc(100vh-4rem)] overflow-hidden">
          <ChatHistorySidebar
            entries={chatHistory}
            onSelectEntry={handleSelectHistoryEntry}
            activeEntryId={activeConversationId}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {(() => {
            if (!hasInteracted) {
              // Initial Welcome Screen
              return (
                <div className="flex-1 flex flex-col items-center justify-center px-4 relative">
                  <div className="absolute top-10 left-1/4 w-64 h-64 bg-red-50 dark:bg-red-950/20 rounded-full filter blur-3xl opacity-30"></div>
                  <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-gray-100 dark:bg-gray-800/20 rounded-full filter blur-3xl opacity-40"></div>
                  <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mb-6 shadow-lg">
                      <Bot className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-medium text-foreground mb-3 text-center">
                      Welcome, {user?.firstName || "User"}!
                    </h1>
                    <p className="text-muted-foreground text-center max-w-md mb-8">
                      Your IT department's virtual assistant. How can I help you today?
                    </p>
                  </div>
                  <div className="w-full max-w-2xl relative z-10">
                    <Card className="mb-8 shadow-lg border-border overflow-hidden">
                      <form onSubmit={handleSendMessage} className="flex items-center p-2">
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask anything about IT..."
                          className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-2 bg-transparent"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-red-500 hover:bg-red-600 text-white rounded-full h-10 w-10 ml-2"
                          disabled={!input.trim()}
                        >
                          <SendIcon className="h-5 w-5" />
                        </Button>
                      </form>
                    </Card>
                    <div className="bg-card p-6 rounded-xl shadow-md border border-border">
                      <h2 className="text-lg font-medium text-foreground mb-4">I can help with:</h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
                        {actionButtons.map((buttonConfig) => (
                          <ActionButton
                            key={buttonConfig.label}
                            icon={buttonConfig.icon}
                            label={buttonConfig.label}
                            onClick={() => handleMainActionClick(buttonConfig)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            } else {
              // Chat Messages Screen
              return (
                <div className="flex-1 overflow-y-auto px-4 py-6 bg-background">
                  <div className="max-w-4xl mx-auto">
                    {messages.map((message) => (
                      <div key={message.id} className="animate-fadeIn mb-8">
                        <ChatMessage message={message} />
                      </div>
                    ))}
                    {isThinking && (
                      <div className="animate-fadeIn mb-8">
                        <ThinkingIndicator />
                      </div>
                    )}
                    {isTyping && currentResponse && (
                      <div className="animate-fadeIn mb-8">
                        <ChatMessage
                          message={{
                            role: "assistant",
                            content: currentResponse,
                            id: "streaming-assistant-response",
                          }}
                        />
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              )
            }
          })()}

          {/* Input area at the bottom after interaction */}
          {hasInteracted && (
            <div className="border-t border-border bg-card p-4">
              <div className="max-w-4xl mx-auto">
                {/* Suggestion prompts above the input */}
                <SuggestionPrompts
                  mainTopics={actionButtons.map(ab => ({ label: ab.label }))}
                  subTopics={currentActionSubTopics || undefined}
                  showSubTopics={isSubTopicSelectionViewActive}
                  onBackToMainClick={handleBackToMainTopics}
                  onPromptClick={(clickedLabel) => {
                    if (isSubTopicSelectionViewActive && currentActionSubTopics) {
                      const subTopic = currentActionSubTopics.find(st => st.label === clickedLabel);
                      if (subTopic) {
                        handleSubTopicClick(subTopic);
                      }
                    } else {
                      const matchingAction = actionButtons.find(action => action.label === clickedLabel);
                      if (matchingAction) {
                        handleMainActionClick(matchingAction);
                      } else {
                        processAIResponse(clickedLabel); // Fallback
                      }
                    }
                  }}
                />

                <Card className="shadow-md border-border">
                  <form onSubmit={handleSendMessage} className="flex items-center p-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask anything about IT..."
                      className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base py-2 bg-transparent"
                      disabled={isThinking || isTyping}
                    />

                    <Button
                      type="submit"
                      size="sm"
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full h-10 w-10 ml-2"
                      disabled={!input.trim() || isThinking || isTyping}
                    >
                      <SendIcon className="h-5 w-5" />
                    </Button>
                  </form>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
