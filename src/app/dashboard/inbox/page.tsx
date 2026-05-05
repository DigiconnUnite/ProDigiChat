"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { parseMessageContent } from "@/types/common"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Search, 
  Send, 
  MoreHorizontal, 
  Phone, 
  User, 
  CheckCheck, 
  Users, 
  MessageSquare, 
  FileText, 
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Archive,
  Star,
  MoreVertical,
  Circle,
  AlertCircle,
  ExternalLink,
  Plug
} from "lucide-react"

// Types
interface Contact {
  id: string
  name: string
  phone: string
  avatar: string
  status: string
  unread: number
  lastMessage: string
  lastMessageTime: string
  tags: string[]
}

interface Message {
  id: string
  type: "sent" | "received"
  text: string
  time: string
  status?: string
  mediaUrl?: string
  messageType?: string
}

export default function InboxPage() {
  const { data: session } = useSession()
  
  // State
  const [conversations, setConversations] = useState<Contact[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // WhatsApp connection state
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)

  // Fetch WhatsApp connection status
  const checkWhatsAppConnection = useCallback(async () => {
    try {
      setIsCheckingConnection(true)
      const response = await fetch("/api/settings/whatsapp")
      
      if (response.ok) {
        const data = await response.json()
        setIsWhatsAppConnected(data.isConnected || false)
      } else {
        setIsWhatsAppConnected(false)
      }
    } catch (err) {
      console.error("Error checking WhatsApp connection:", err)
      setIsWhatsAppConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }, [])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    // Don't fetch if WhatsApp is not connected
    if (isWhatsAppConnected === false) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/inbox")
      
      if (!response.ok) {
        throw new Error("Failed to fetch conversations")
      }
      
      const data = await response.json()
      
      // Only show real data if WhatsApp is connected
      if (data.conversations && data.conversations.length > 0 && isWhatsAppConnected) {
        setConversations(data.conversations)
      } else if (isWhatsAppConnected) {
        // Connected but no conversations yet
        setConversations([])
      }
      // If not connected, don't show any conversations (error message will be shown)
    } catch (err) {
      console.error("Error fetching conversations:", err)
      // Only show error if WhatsApp is connected
      if (isWhatsAppConnected) {
        setError("Failed to load conversations")
      }
    } finally {
      setIsLoading(false)
    }
  }, [isWhatsAppConnected])

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (contactId: string) => {
    // Don't fetch if WhatsApp is not connected
    if (isWhatsAppConnected === false) {
      setIsLoadingMessages(false)
      return
    }
    
    try {
      setIsLoadingMessages(true)
      
      const response = await fetch(`/api/inbox?contactId=${contactId}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages")
      }
      
      const data = await response.json()
      
      if (data.messages && data.messages.length > 0 && isWhatsAppConnected) {
        // Transform messages to UI format
        const transformedMessages: Message[] = data.messages.map((msg: any) => {
          let content: any = { text: "", caption: "", mediaUrl: "", type: "text" }
          try {
            // Use the proper parseMessageContent utility
            content = parseMessageContent(msg.content)
          } catch (e) {
            // If not JSON, treat the content as plain text
            content = { text: msg.content, caption: "", mediaUrl: "", type: "text" }
          }
          
          // Handle different message types
          let displayText = content.text || content.caption || "Media message"
          
          // Handle template messages specially
          if (content.type === 'template' && content.template) {
            displayText = content.template.text || content.template.body || "Template message"
          }
          
          return {
            id: msg.id,
            type: msg.direction === "outgoing" ? "sent" : "received",
            text: displayText,
            time: formatTime(new Date(msg.createdAt)),
            status: msg.status,
            mediaUrl: content.mediaUrl,
            messageType: content.type || "text"
          }
        })
        setMessages(transformedMessages)
      } else if (isWhatsAppConnected) {
        // Connected but no messages yet
        setMessages([])
      }
      // If not connected, don't show any messages

      // Mark messages as read
      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId })
      })
      
      // Update conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === contactId ? { ...conv, unread: 0 } : conv
        )
      )
    } catch (err) {
      console.error("Error fetching messages:", err)
      // Only show error if WhatsApp is connected
      if (isWhatsAppConnected) {
        setError("Failed to load messages")
      }
    } finally {
      setIsLoadingMessages(false)
    }
  }, [isWhatsAppConnected])

  // Initial fetch - check WhatsApp connection first
  useEffect(() => {
    checkWhatsAppConnection()
  }, [checkWhatsAppConnection])

  // Fetch conversations when connection status is known
  useEffect(() => {
    if (isWhatsAppConnected !== null) {
      fetchConversations()
    }
  }, [isWhatsAppConnected, fetchConversations])

  // Set initial selected conversation
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0])
    }
  }, [conversations, selectedConversation])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }, [selectedConversation, fetchMessages])

  // Initialize WebSocket for real-time updates
  useEffect(() => {
    const orgId = (session as any)?.orgId || (session as any)?.organizationId
    if (!orgId || !isWhatsAppConnected) return

    // Initialize WebSocket connection
    const socketUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://localhost:3000'
    
    try {
      // @ts-ignore - Socket.IO might not be in types
      socketRef.current = io(socketUrl, {
        transports: ['websocket', 'polling']
      })

      const socket = socketRef.current

      // Join inbox room
      socket.emit('join-inbox', orgId)

      // Listen for new messages
      socket.on('new-message', (data: any) => {
        console.log('New message received:', data)
        
        // If message is for current conversation, add it
        if (selectedConversation && data.contactId === selectedConversation.id) {
          const newMessage: Message = {
            id: data.messageId,
            type: data.sender?.id === session?.user?.id ? "sent" : "received",
            text: data.content?.text || "New message",
            time: formatTime(new Date(data.createdAt)),
            status: data.status,
            messageType: data.content?.type || "text"
          }
          setMessages(prev => [...prev, newMessage])
        }

        // Refresh conversations list
        fetchConversations()
      })

      // Listen for message status updates
      socket.on('message-status', (data: any) => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, status: data.status }
              : msg
          )
        )
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
      })

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
      })

    } catch (error) {
      console.error('WebSocket initialization error:', error)
    }

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [session, isWhatsAppConnected, selectedConversation?.id, fetchConversations])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Filter conversations
  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.phone.includes(searchQuery)
  )

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || isSending) return

    try {
      setIsSending(true)
      
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedConversation.id,
          content: messageInput.trim(),
          type: "text"
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to send message")
      }

      const data = await response.json()
      
      if (data.success && data.message) {
        // Add the new message to the list
        setMessages(prev => [...prev, data.message])
        
        // Update conversation's last message
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: messageInput.trim(),
                  lastMessageTime: "Just now"
                }
              : conv
          )
        )
        
        // Clear input
        setMessageInput("")
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
        }, 100)
      } else {
        // Handle case where API returns success but no message
        const newMessage: Message = {
          id: Date.now().toString(),
          type: "sent",
          text: messageInput.trim(),
          time: formatTime(new Date()),
          status: "sent"
        }
        setMessages(prev => [...prev, newMessage])
        
        // Update conversation's last message
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  lastMessage: messageInput.trim(),
                  lastMessageTime: "Just now"
                }
              : conv
          )
        )
        
        setMessageInput("")
      }
    } catch (err) {
      console.error("Error sending message:", err)
      
      // Show error toast if available
      if (typeof window !== 'undefined' && (window as any).toast) {
        ;(window as any).toast.error(err instanceof Error ? err.message : "Failed to send message")
      }
      
      // Still add message locally for better UX
      const newMessage: Message = {
        id: Date.now().toString(),
        type: "sent",
        text: messageInput.trim(),
        time: formatTime(new Date()),
        status: "failed"
      }
      setMessages(prev => [...prev, newMessage])
      setMessageInput("")
    } finally {
      setIsSending(false)
    }
  }

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Refresh conversations
  const handleRefresh = () => {
    fetchConversations()
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
    }
  }

  // Show loading while checking connection
  if (isCheckingConnection) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-gray-500">Manage your WhatsApp conversations and messages</p>
          </div>
          <Button className="gap-2" disabled>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="border rounded-lg bg-white">
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
            <p className="text-gray-500">Loading inbox...</p>
          </div>
        </div>
        </div>
      </div>
    )
  }

  // Show error message when WhatsApp is not connected
  if (!isWhatsAppConnected) {
    return (
      <div className="bg-transparent px-2.5 border h-full lg:px-0">
        <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-gray-500">Manage your WhatsApp conversations and messages</p>
          </div>
          <Button className="gap-2" onClick={() => window.location.href = '/dashboard/settings/whatsapp'}>
            <Plug className="w-4 h-4" />
            Connect WhatsApp
          </Button>
        </div>

        <div className="border rounded-lg bg-white p-12 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plug className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium mb-2">WhatsApp Not Connected</h3>
          <p className="text-gray-500 mb-6">
            To receive and view conversations in your inbox, you need to connect your WhatsApp account and configure webhooks.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 text-left mb-6 max-w-2xl mx-auto">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              How to Connect WhatsApp:
            </h4>
            <ol className="list-decimal list-inside text-sm space-y-2 text-gray-600">
              <li>Go to <strong>Settings → WhatsApp</strong></li>
              <li>Click "Connect WhatsApp Account" button</li>
              <li>Authenticate with your Meta Business Account</li>
              <li>After connecting, configure webhooks to receive messages</li>
            </ol>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left mb-6 max-w-2xl mx-auto">
            <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              Webhook Configuration Required:
            </h4>
            <p className="text-sm text-yellow-700 mb-3">
              To receive incoming messages, you need to configure a webhook URL in your Meta Developer Portal:
            </p>
            <div className="bg-white rounded p-3 font-mono text-xs break-all border border-yellow-200">
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhooks
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              Add this URL in Meta Developer Portal → Webhooks → Subscribe to messages field
            </p>
          </div>
          
          <Button 
            onClick={() => window.location.href = '/dashboard/settings/whatsapp'}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plug className="h-4 w-4 mr-2" />
            Go to WhatsApp Settings
          </Button>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-transparent px-2.5 border h-full lg:px-0">
      <div className="container mx-auto relative border-l min-h-[87vh] border-r border-slate-300 px-5 py-6 space-y-6">
      {/* Header Actions - Only show when WhatsApp is not connected */}
      {!isWhatsAppConnected && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-gray-500">
              Manage your WhatsApp conversations and messages
            </p>
          </div>
          <Button className="gap-2" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      )}

      {/* Chat Interface */}
      <div className="border rounded-lg bg-white overflow-hidden" style={{ height: isWhatsAppConnected ? 'calc(87vh - 48px)' : 'calc(87vh - 200px)' }}>
        <div className="p-0 gap-2 bg-gray-200 flex h-full">
          {/* Conversations List */}
          <div className="w-80 border border-border flex flex-col bg-white">
            <div className="p-4 border-b border-border shrink-0 flex items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 shrink-0"
                onClick={handleRefresh}
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 py-0 min-h-0">
              <div className="p-2 relative space-y-1">
                {error && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                    <button 
                      onClick={() => setError(null)}
                      className="ml-auto text-red-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? "bg-primary/10 border-2 border-primary"
                          : "hover:bg-muted/50 border-2 border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback
                              className={
                                conversation.unread > 0
                                  ? "bg-primary text-primary-foreground"
                                  : ""
                              }
                            >
                              {conversation.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ${
                              conversation.status === "active"
                                ? "bg-green-500"
                                : conversation.status === "waiting"
                                  ? "bg-yellow-500"
                                  : "bg-gray-400"
                            }`}
                          />
                        </div>
                        <div className="flex-1 w-full min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`font-medium text-sm truncate ${conversation.unread > 0 ? "font-semibold" : ""}`}
                            >
                              {conversation.name}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {conversation.lastMessageTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground w-full truncate flex">
                              {conversation.lastMessage}
                            </p>
                            {conversation.unread > 0 && (
                              <Badge className="h-5 min-w-5 rounded-full px-1.5 bg-primary text-primary-foreground">
                                {conversation.unread}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Window */}
          <div
            className="flex-1 shadow-sm flex flex-col min-w-0 overflow-y-auto"
            style={{
              backgroundColor: "#ECE5DD",
              backgroundImage: "url('/whatsapp-doodle-bg.png')",
            }}
          >
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b rounded-b-2xl bg-green-950 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {selectedConversation.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-white font-semibold">
                          {selectedConversation.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground ">
                          <Phone className="h-3 w-3" />
                          {selectedConversation.phone}
                          <span className="flex items-center gap-1 ml-2">
                            <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                            <span className="text-xs">Online</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        title="View Profile"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" title="Archive">
                        <Archive className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="More Options"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 min-h-0 p-4">
                  <div className="space-y-3 pb-2">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No messages yet</p>
                        <p className="text-xs">
                          Send a message to start the conversation
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === "sent" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 shadow-md ${
                              message.type === "sent"
                                ? "bg-primary text-primary-foreground rounded-tr-none"
                                : "bg-white text-foreground rounded-tl-none"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {message.text}
                            </p>
                            <div
                              className={`flex items-center gap-1 mt-1 text-xs ${
                                message.type === "sent"
                                  ? "text-primary-foreground/70"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {message.time}
                              {message.type === "sent" &&
                                (message.status === "read" ? (
                                  <CheckCheck className="h-3 w-3 text-blue-400" />
                                ) : message.status === "delivered" ? (
                                  <CheckCheck className="h-3 w-3" />  
                                ) : (
                                  <CheckCheck className="h-3 w-3 opacity-50" />
                                ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t rounded-t-2xl bg-neutral-900 border-border">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" title="Attach File">
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="Attach Image">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1 bg-white"
                      disabled={isSending}
                    />
                    <Button
                      className="bg-primary hover:bg-primary/90"
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim() || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    No conversation selected
                  </p>
                  <p className="text-sm">
                    Select a conversation from the list to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info Sidebar */}
          <div className="w-72 bg-white rounded-r-md border border-l border-border p-4 overflow-hidden flex flex-col">
            <h3 className="font-semibold mb-4 shrink-0">Contact Details</h3>
            <ScrollArea className="flex-1 min-h-0">
              <div className="pr-4">
              {selectedConversation && (
              <div className="space-y-6">
                {/* Avatar and Name */}
                <div className="text-center">
                  <Avatar className="h-20 w-20 mx-auto mb-3">
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                      {selectedConversation.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="font-semibold text-lg">
                    {selectedConversation.name}
                  </h4>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                    <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                    Active
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Phone</p>
                    <p className="font-mono text-sm">
                      {selectedConversation.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <Badge
                      variant={
                        selectedConversation.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedConversation.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedConversation.tags && Array.isArray(selectedConversation.tags) && selectedConversation.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(!selectedConversation.tags || !Array.isArray(selectedConversation.tags) || selectedConversation.tags.length === 0) && (
                        <span className="text-xs text-muted-foreground">
                          No tags
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Quick Actions</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    View Full Profile
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Conversation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    size="sm"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Mark as VIP
                  </Button>
                </div>
              </div>
            )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

// Helper function to format time
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}
