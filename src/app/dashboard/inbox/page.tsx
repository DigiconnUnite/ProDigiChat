"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { parseMessageContent, parseTags } from "@/types/common"
import { useSession } from "next-auth/react"
import { io } from 'socket.io-client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StandardLayout } from "@/components/ui/standard-layout"
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
  Circle,
  AlertCircle,
  ExternalLink,
  Plug,
  X,
  Video,
  File,
  List,
  Link as LinkIcon,
  MapPin,
  Reply,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────

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

interface ParsedContent {
  type: string
  text?: string
  caption?: string
  mediaUrl?: string
  mediaType?: string
  fileName?: string
  fileSize?: string
  interactive?: {
    type: string
    header?: { type: string; text?: string }
    body?: { text?: string; buttons?: Array<{ type: string; title: string; payload?: string; url?: string }> }
  }
  list?: Array<{ title: string; rows?: Array<Array<string>> }>
  location?: { name?: string; address?: string; latitude?: string; longitude?: string }
}

interface Message {
  id: string
  type: "sent" | "received"
  parsed: ParsedContent | null
  rawText: string
  time: string
  status?: string
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

// ─── Robust Content Parser ──────────────────────────────

function parseContent(raw: string): ParsedContent {
  console.log("parseContent - Raw Input:", raw);
  // Try the imported utility first
  try {
    const parsed = parseMessageContent(raw)
    console.log("parseContent - Parsed using parseMessageContent:", parsed);
    if (parsed && (parsed.type || parsed.text)) {
      // Convert MessageContent to ParsedContent format
      return {
        type: parsed.type || 'text',
        text: parsed.text || parsed.caption || '',
        caption: parsed.caption,
        mediaUrl: parsed.mediaUrl,
        mediaType: parsed.mediaType,
        fileName: parsed.fileName,
        fileSize: parsed.fileSize,
        interactive: parsed.interactive,
        list: parsed.list,
        location: parsed.location,
      }
    }
  } catch {}

  // Fallback: try JSON parse
  try {
    const obj = JSON.parse(raw)
    
    // Handle text messages - check multiple possible text fields
    if (obj.text) {
      return { type: 'text', text: obj.text }
    }
    if (obj.body) {
      return { type: 'text', text: obj.body }
    }
    if (obj.content) {
      return { type: 'text', text: obj.content }
    }
    
    // Handle image messages
    if (obj.type === 'image' || obj.image) {
      return {
        type: 'image',
        caption: obj.image?.caption || obj.caption || obj.body || obj.text,
        mediaUrl: obj.image?.url || obj.media?.url || obj.mediaUrl,
        mediaType: obj.image?.mime_type || obj.image?.type,
      }
    }
    
    // Handle video messages
    if (obj.type === 'video' || obj.video) {
      return {
        type: 'video',
        caption: obj.video?.caption || obj.caption || obj.body || obj.text,
        mediaUrl: obj.video?.url || obj.media?.url || obj.mediaUrl,
        mediaType: obj.video?.mime_type || obj.video?.type,
      }
    }
    
    // Handle document messages
    if (obj.type === 'document' || obj.document) {
      return {
        type: 'document',
        caption: obj.document?.caption || obj.caption || obj.body || obj.text,
        fileName: obj.document?.filename || obj.document?.name || 'Document',
        fileSize: obj.document?.file_size,
        mediaUrl: obj.document?.url || obj.media?.url || obj.mediaUrl,
        mediaType: obj.document?.mime_type || obj.document?.type,
      }
    }
    
    // Handle interactive messages
    if (obj.type === 'interactive' || obj.interactive) {
      return {
        type: 'interactive',
        text: obj.interactive?.body?.text || obj.body?.text || obj.text || '',
        interactive: obj.interactive || obj.body,
      }
    }
    
    // Handle template messages
    if (obj.type === 'template' || obj.template) {
      return {
        type: 'template',
        text: obj.template?.body?.text || obj.body?.text || obj.text || '',
        interactive: obj.template?.body,
      }
    }
    
    // Handle location messages
    if (obj.type === 'location' || obj.location) {
      return {
        type: 'location',
        location: obj.location,
      }
    }
    
    // Handle list messages
    if (obj.type === 'list' || obj.list) {
      return {
        type: 'list',
        list: obj.list,
      }
    }
    
    // Handle sticker messages
    if (obj.type === 'sticker' || obj.sticker) {
      return {
        type: 'sticker',
        mediaUrl: obj.sticker?.url || obj.media?.url || obj.mediaUrl,
      }
    }
    
    // If it's a simple string in the JSON, treat it as text
    if (typeof obj === 'string') {
      return { type: 'text', text: obj }
    }
    
    // If we have a type but no specific handler, try to extract text
    if (obj.type) {
      const textContent = obj.text || obj.body || obj.content || obj.caption || JSON.stringify(obj)
      return { type: 'text', text: textContent }
    }
    
    // Fallback to raw text if it's a simple string
    if (typeof raw === 'string' && !raw.startsWith('{')) {
      return { type: 'text', text: raw }
    }
    
    // Last resort - try to find any text field in the object
    const possibleTextFields = ['text', 'body', 'content', 'caption', 'message']
    for (const field of possibleTextFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return { type: 'text', text: obj[field] }
      }
    }
    
    // Final fallback - show a clean message instead of raw JSON
    return { type: 'text', text: 'Message content' }
    
  } catch (e) {
    // If JSON parsing fails, treat as plain text
    if (typeof raw === 'string' && !raw.includes('{') && !raw.includes('[')) {
      return { type: 'text', text: raw }
    }
    // Final fallback
    return { type: 'text', text: 'Message content' }
  }
}

// ─── Message Bubble Renderer ──────────────────────────

function MessageBubble({ message }: { message: Message }) {
  console.log("MessageBubble - Message data:", message);
  const parsed = message.parsed
  const isSent = message.type === "sent"

  if (!parsed || !parsed.text) {
    console.log("MessageBubble - No parsed text, using fallback");
    // Try to extract text from rawText if it's not JSON
    let displayText = message.rawText
    try {
      const parsed = JSON.parse(message.rawText)
      displayText = parsed.text || parsed.body || parsed.content || 'Message'
    } catch {
      // If rawText is not JSON, use it as is
      if (message.rawText.startsWith('{') || message.rawText.startsWith('[')) {
        displayText = 'Message'
      }
    }
    
    return (
      <div className={cn(
        "max-w-[70%] rounded-xl p-3 shadow-sm min-w-0 break-words",
        isSent ? "bg-[#005c4b] text-white rounded-tr-sm" : "bg-white text-foreground rounded-tl-sm"
      )}>
        <p className="text-sm whitespace-pre-wrap leading-relaxed break-all overflow-wrap-anywhere word-break-break-all">{displayText}</p>
        <MessageMeta time={message.time} status={message.status} isSent={isSent} />
      </div>
    )
  }

  switch (parsed.type) {
    case 'image':
      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm min-w-0", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          {parsed.mediaUrl ? (
            <img
              src={parsed.mediaUrl}
              alt={parsed.caption || 'Image'}
              className="w-full max-h-[300px] object-cover rounded-t-xl"
              style={isSent ? { borderRadius: '12px 12px 0 0' } : { borderRadius: '12px 12px 0 0' }}
            />
          ) : (
            <div className={cn("p-6 flex items-center justify-center rounded-t-xl", isSent ? "bg-[#005c4b]/90" : "bg-slate-100")}>
              <ImageIcon className={cn("w-12 h-12", isSent ? "text-white/50" : "text-slate-400")} />
            </div>
          )}
          {(parsed.caption || parsed.text) && (
            <div className={cn("px-3 py-2 min-w-0", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
              <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{parsed.caption || parsed.text}</p>
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </div>
          )}
        </div>
      )

    case 'video':
      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm min-w-0", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          {parsed.mediaUrl ? (
            <video
              src={parsed.mediaUrl}
              controls
              className="w-full max-h-[300px] rounded-t-xl bg-black"
              style={isSent ? { borderRadius: '12px 12px 0 0' } : { borderRadius: '12px 12px 0 0' }}
            />
          ) : (
            <div className={cn("p-6 flex flex-col items-center justify-center gap-2 rounded-t-xl", isSent ? "bg-[#005c4b]/90" : "bg-slate-100")}>
              <Video className={cn("w-12 h-12", isSent ? "text-white/50" : "text-slate-400")} />
              <p className="text-xs opacity-60">Video</p>
            </div>
          )}
          {(parsed.caption || parsed.text) && (
            <div className={cn("px-3 py-2 min-w-0", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
              <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{parsed.caption || parsed.text}</p>
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </div>
          )}
        </div>
      )

    case 'document':
      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm min-w-0", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          <div className={cn("px-4 py-3 flex items-center gap-3 min-w-0", isSent ? "bg-[#005c4b] text-white" : "bg-slate-100")}>
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isSent ? "bg-white/20" : "bg-white")}>
              <File className={cn("w-5 h-5", isSent ? "text-white/70" : "text-slate-500")} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{parsed.fileName || 'Document'}</p>
              {parsed.fileSize && <p className="text-xs opacity-60">{parsed.fileSize}</p>}
            </div>
          </div>
          {(parsed.caption || parsed.text) && (
            <div className={cn("px-3 pb-3 min-w-0", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
              <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{parsed.caption || parsed.text}</p>
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </div>
          )}
        </div>
      )

    case 'sticker':
      return (
        <div className={cn("max-w-[200px] rounded-xl p-2 shadow-sm inline-block", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          {parsed.mediaUrl ? (
            <img
              src={parsed.mediaUrl}
              alt="Sticker"
              className="w-40 h-40 object-contain"
            />
          ) : (
            <div className={cn("p-6 flex items-center justify-center rounded-xl", isSent ? "bg-[#005c4b]/90" : "bg-slate-100")}>
              <MessageSquare className={cn("w-12 h-12", isSent ? "text-white/50" : "text-slate-400")} />
            </div>
          )}
        </div>
      )

    case 'location':
      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          <div className={cn("p-3 rounded-t-xl", isSent ? "bg-[#005c4b]/90" : "bg-slate-100")}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", isSent ? "bg-white/20" : "bg-white")}>
                <MapPin className={cn("w-5 h-5", isSent ? "text-white/70" : "text-slate-500")} />
              </div>
              <div>
                <p className="text-xs font-medium opacity-70">Location</p>
                <p className="text-xs opacity-50">Shared a location</p>
              </div>
            </div>
          </div>
          {parsed.location?.name && (
            <div className={cn("px-3 pb-3", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
              <p className="text-sm font-medium">{parsed.location.name}</p>
              {parsed.location.address && <p className="text-xs opacity-60 mt-0.5">{parsed.location.address}</p>}
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </div>
          )}
        </div>
      )

    case 'interactive':
    case 'template': {
      const header = parsed.interactive?.header
      const body = parsed.interactive?.body
      const buttons = body?.buttons || []

      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          {header && (
            <div className={cn("px-4 py-2.5 text-center rounded-t-xl", isSent ? "bg-[#005c4b] text-white" : "bg-slate-200")}>
              {header.type === 'text' && (
                <p className="text-sm font-semibold">{header.text}</p>
              )}
            </div>
          )}
          <div className={cn("px-3 pb-2", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
            {body?.text && <p className="text-sm whitespace-pre-wrap mb-3">{body.text}</p>}
            {buttons.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {buttons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (btn.type === 'web_url' && btn.url) window.open(btn.url, '_blank')
                    }}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-lg text-sm text-center transition-colors border font-medium",
                      isSent
                        ? "border-white/30 hover:bg-white/20 text-white"
                        : "border-slate-200 bg-[#005c4b] hover:bg-[#004d40] text-foreground"
                    )}
                  >
                    {btn.title}
                  </button>
                ))}
              </div>
            )}
            <MessageMeta time={message.time} status={message.status} isSent={isSent} />
          </div>
        </div>
      )
    }

    case 'list':
      return (
        <div className={cn("max-w-[70%] rounded-xl overflow-hidden shadow-sm", isSent ? "rounded-tr-sm" : "rounded-tl-sm")}>
          {parsed.list && parsed.list.length > 0 ? (
            <>
              {parsed.list.map((section, i) => (
                <div key={i} className={cn("px-3 py-2", i > 0 && "border-t border-slate-100")}>
                  {section.title && (
                    <p className={cn("text-sm font-semibold mb-2", isSent ? "text-white/80" : "text-foreground")}>{section.title}</p>
                  )}
                  {section.rows && section.rows.map((row, j) => (
                    <p key={j} className={cn("text-sm", isSent ? "text-white/80" : "text-foreground")}>
                      {row.map((item, k) => (
                        <span key={k}>{k > 0 ? " • " : ""}{item}</span>
                      ))}
                    </p>
                  ))}
                </div>
              ))}
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </>
          ) : (
            <div className={cn("px-3 py-3", isSent ? "bg-[#005c4b] text-white" : "bg-white")}>
              <p className="text-sm opacity-60">List message</p>
              <MessageMeta time={message.time} status={message.status} isSent={isSent} />
            </div>
          )}
        </div>
      )

    default: // text or unknown
      const displayText = parsed?.text || message.rawText || 'Message'
      const cleanText = displayText.startsWith('{') || displayText.startsWith('[') ? 'Message' : displayText
      
      return (
        <div className={cn(
          "max-w-[70%] rounded-xl p-3 shadow-sm min-w-0 break-words",
          isSent ? "bg-[#005c4b] text-white rounded-tr-sm" : "bg-white text-foreground rounded-tl-sm"
        )}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed break-all overflow-wrap-anywhere word-break-break-all">{cleanText}</p>
          <MessageMeta time={message.time} status={message.status} isSent={isSent} />
        </div>
      )
  }
}

function MessageMeta({ time, status, isSent }: { time: string; status?: string; isSent: boolean }) {
  return (
    <div className={cn("flex items-center gap-1 mt-1 text-xs", isSent ? "text-white/60" : "text-muted-foreground")}>
      <span>{time}</span>
      {isSent && (
        status === "read" ? (
          <CheckCheck className="h-3.5 w-3.5 text-cyan-300" />
        ) : status === "delivered" ? (
          <CheckCheck className="h-3.5 w-3.5" />
        ) : (
          <CheckCheck className="h-3.5 w-3.5 opacity-40" />
        )
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function InboxPage() {
  const { data: session } = useSession()

  const [conversations, setConversations] = useState<Contact[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState<boolean | null>(null)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [socketConnected, setSocketConnected] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)
  const selectedConversationRef = useRef<typeof selectedConversation>(null)

  // ─── Fetch connection status ──────────────────────────────
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
    } catch {
      setIsWhatsAppConnected(false)
    } finally {
      setIsCheckingConnection(false)
    }
  }, [])

  // ─── Fetch conversations ──────────────────────────────
  const fetchConversations = useCallback(async () => {
    if (isWhatsAppConnected === false) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/inbox")
      if (!response.ok) throw new Error("Failed to fetch conversations")
      const data = await response.json()
      setConversations(data.conversations || [])
    } catch (err) {
      setError("Failed to load conversations")
    } finally {
      setIsLoading(false)
    }
  }, [isWhatsAppConnected])

  // ─── Fetch messages ──────────────────────────────
  const fetchMessages = useCallback(async (contactId: string) => {
    if (isWhatsAppConnected === false) {
      setIsLoadingMessages(false)
      return
    }
    try {
      setIsLoadingMessages(true)
      const response = await fetch(`/api/inbox?contactId=${contactId}`)
      if (!response.ok) throw new Error("Failed to fetch messages")
      const data = await response.json()

      if (data.messages && data.messages.length > 0 && isWhatsAppConnected) {
        const transformedMessages: Message[] = data.messages.map((msg: any) => {
          try {
            const rawContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
            const parsed = parseContent(rawContent)

            return {
              id: msg.id,
              type: msg.direction === "outgoing" ? "sent" : "received",
              parsed,
              rawText: rawContent,
              time: formatTime(new Date(msg.createdAt)),
              status: msg.status,
            }
          } catch {
            return {
              id: msg.id,
              type: msg.direction === "outgoing" ? "sent" : "received",
              parsed: null,
              rawText: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              time: formatTime(new Date(msg.createdAt)),
              status: msg.status,
            }
          }
        })
        setMessages(transformedMessages)
      } else if (isWhatsAppConnected) {
        setMessages([])
      }

      await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId })
      })

      setConversations(prev =>
        prev.map(conv =>
          conv.id === contactId ? { ...conv, unread: 0 } : conv
        )
      )
    } catch {
      if (isWhatsAppConnected) setError("Failed to load messages")
    } finally {
      setIsLoadingMessages(false)
    }
  }, [isWhatsAppConnected])

  // ─── Effects ──────────────────────────────
  useEffect(() => { checkWhatsAppConnection() }, [checkWhatsAppConnection])
  useEffect(() => { if (isWhatsAppConnected !== null) fetchConversations() }, [isWhatsAppConnected, fetchConversations])
  useEffect(() => { if (conversations.length > 0 && !selectedConversation) setSelectedConversation(conversations[0]) }, [conversations, selectedConversation])
  useEffect(() => { if (selectedConversation) fetchMessages(selectedConversation.id) }, [selectedConversation, fetchMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])
  // Keep ref in sync so WebSocket handlers always read the latest selected conversation
  useEffect(() => { selectedConversationRef.current = selectedConversation }, [selectedConversation])

  // ─── WebSocket ──────────────────────────────
  useEffect(() => {
    const orgId = (session as any)?.orgId || (session as any)?.organizationId
    if (!orgId || !isWhatsAppConnected) return

    const socketUrl = process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:3000'

    try {
      socketRef.current = io(socketUrl, { transports: ['websocket', 'polling'] })
      const socket = socketRef.current
      socket.emit('join-inbox', orgId)

      socket.on('connect', () => setSocketConnected(true))
      socket.on('disconnect', () => setSocketConnected(false))
      socket.on('connect_error', () => setSocketConnected(false))

      socket.on('new-message', (data: any) => {
        const current = selectedConversationRef.current
        if (current && data.contactId === current.id) {
          const rawContent = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '')
          const parsed = parseContent(rawContent)
          setMessages(prev => [...prev, {
            id: data.messageId,
            type: data.direction === "incoming" ? "received" : data.sender?.id === session?.user?.id ? "sent" : "received",
            parsed,
            rawText: rawContent,
            time: formatTime(new Date(data.createdAt)),
            status: data.status,
          }])
        }
        fetchConversations()
      })

      socket.on('message-status', (data: any) => {
        setMessages(prev => prev.map(msg => msg.id === data.messageId ? { ...msg, status: data.status } : msg))
      })
    } catch {
      // WebSocket init failed
    }

    return () => { if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null } }
  }, [session, isWhatsAppConnected, fetchConversations])

  // ─── Send message ──────────────────────────────
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || isSending) return

    try {
      setIsSending(true)
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: selectedConversation.id, content: messageInput.trim(), type: "text" })
      })

      if (!response.ok) throw new Error("Failed to send message")

      const data = await response.json()
      
      // Always use the original message text for sent messages
      const messageText = messageInput.trim()
      const parsed = { type: 'text', text: messageText }
      const rawContent = messageText

      setMessages(prev => [...prev, {
        id: data.messageId || data.message?.id || Date.now().toString(),
        type: "sent",
        parsed,
        rawText: rawContent,
        time: formatTime(new Date()),
        status: "sent",
      }])

      setConversations(prev => prev.map(conv => conv.id === selectedConversation.id ? { ...conv, lastMessage: messageInput.trim(), lastMessageTime: "Just now" } : conv))
      setMessageInput("")
      setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, 100)
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: "sent",
        parsed: null,
        rawText: messageInput.trim(),
        time: formatTime(new Date()),
        status: "failed",
      }])
      setMessageInput("")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() }
  }

  const handleRefresh = () => {
    fetchConversations()
    if (selectedConversation) fetchMessages(selectedConversation.id)
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase()) || conv.phone.includes(searchQuery)
  )

  const getAvatarColor = (name: string) => {
    const colors = ['bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  // ═══════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════

  if (isCheckingConnection) {
    return (
      <StandardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Inbox</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp conversations</p>
            </div>
          </div>
          <div className="p-5 rounded-xl border-2 border-green-950 bg-white">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </div>
        </div>
      </StandardLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // NOT CONNECTED STATE
  // ═══════════════════════════════════════════════════════════════

  if (!isWhatsAppConnected) {
    return (
      <StandardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-foreground text-2xl font-bold mb-1">Inbox</h1>
              <p className="text-muted-foreground text-lg">Manage your WhatsApp conversations</p>
            </div>
            <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => window.location.href = '/dashboard/settings/whatsapp'}>
              <Plug className="w-4 h-4 mr-2" />
              Connect WhatsApp
            </Button>
          </div>

          <div className="p-5 rounded-xl border-2 border-red-400 bg-red-50 text-center py-20">
            <div className="h-14 w-14 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Plug className="h-7 w-7 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">WhatsApp Not Connected</h3>
            <p className="text-muted-foreground text-sm mb-8 max-w-lg mx-auto">
              To receive and view conversations, connect your WhatsApp account and configure webhooks.
            </p>

            <div className="p-5 rounded-xl border-2 border-slate-200 bg-white max-w-2xl mx-auto text-left mb-6">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <ExternalLink className="w-4 h-4" />
                How to Connect
              </h4>
              <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                <li>Go to <span className="font-medium text-foreground">Settings → WhatsApp</span></li>
                <li>Click <span className="font-medium text-foreground">Connect WhatsApp Account</span></li>
                <li>Authenticate with your Meta Business Account</li>
                <li>Configure webhooks to receive messages</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-200 max-w-2xl mx-auto text-left mb-8">
              <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4" />
                Webhook Required
              </h4>
              <p className="text-xs text-amber-700 mb-2">Configure this webhook URL in Meta Developer Portal:</p>
              <code className="text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-amber-200 block break-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhooks
              </code>
            </div>

            <Button className="rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm" onClick={() => window.location.href = '/dashboard/settings/whatsapp'}>
              <Plug className="w-4 h-4 mr-2" />
              Go to WhatsApp Settings
            </Button>
          </div>
        </div>
      </StandardLayout>
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═════════════════════════════════════════════════════════════

  return (
    <StandardLayout className="max-h-[87vh] overflow-hidden">
      <div className="w-full h-[calc(100vh-160px)]  flex rounded-xl border-2 border-green-950 bg-white overflow-hidden">

            {/* ─── Conversations List ─── */}
            <div className="w-80 border-r-2 border-slate-100 flex flex-col bg-white shrink-0">
              <div className="p-4 border-b border-slate-100 shrink-0">
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 text-sm rounded-lg border-slate-300 h-10"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg shrink-0"
                    onClick={handleRefresh}
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                  {error && (
                    <div className="mb-2 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-red-700">{error}</p>
                      </div>
                      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16">
                      <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-slate-50 flex items-center justify-center">
                        <MessageSquare className="h-7 w-7 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-foreground">No conversations yet</p>
                      <p className="text-xs text-muted-foreground">Incoming messages will appear here</p>
                    </div>
                  ) : (
                    filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={cn(
                          "w-full p-3 rounded-xl text-left transition-all",
                          selectedConversation?.id === conversation.id
                            ? "bg-green-50 border-2 border-green-950"
                            : "hover:bg-slate-50 border-2 border-transparent"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            <div className={cn(
                              "h-11 w-11 rounded-xl flex items-center justify-center font-semibold text-xs",
                              getAvatarColor(conversation.name)
                            )}>
                              {conversation.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className={cn(
                              "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                              conversation.status === "active" ? "bg-green-500" : "bg-slate-400"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={cn(
                                "text-sm truncate block max-w-full",
                                conversation.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"
                              )}>
                                {conversation.name}
                              </span>
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {conversation.lastMessageTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground flex-1 min-w-0 overflow-hidden break-all" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                {conversation.lastMessage}
                              </p>
                              {conversation.unread > 0 && (
                                <Badge className="h-5 min-w-5 rounded-full px-1.5 bg-green-600 text-white border-0 text-xs flex items-center justify-center shrink-0">
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

            {/* ─── Chat Window ─── */}
            <div
              className="flex-1 flex flex-col min-w-0  overflow-hidden"
              style={{
                backgroundColor: "#ECE5DD",
                backgroundImage: "url('/whatsapp-doodle-bg.png')",
              }}
            >
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="px-4 py-3 bg-green-950 border-b border-gray-50 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-xs",
                          getAvatarColor(selectedConversation.name)
                        )}>
                          {selectedConversation.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm">{selectedConversation.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-green-200/70">
                            <Phone className="h-3 w-3" />
                            {selectedConversation.phone}
                            <span className="flex items-center gap-1 ml-1">
                              <Circle className="h-1.5 w-1.5 fill-green-400 text-green-400" />
                              Online
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-300 hover:text-white hover:bg-green-800 rounded-lg">
                          <User className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-300 hover:text-white hover:bg-green-800 rounded-lg">
                          <Archive className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-300 hover:text-white hover:bg-green-800 rounded-lg">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* WebSocket disconnection indicator */}
                  {!socketConnected && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
                      <span className="text-xs text-yellow-800">Connection lost — attempting to reconnect…</span>
                    </div>
                  )}

                  {/* Messages */}
                  <ScrollArea className="flex-1 min-h-0 p-4 h-full">
                    <div className="space-y-2 pb-2">
                      {isLoadingMessages ? (
                        <div className="flex items-center justify-center py-16">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                          <div className="h-14 w-14 rounded-xl border-2 border-slate-200 bg-white/80 flex items-center justify-center">
                            <MessageSquare className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-foreground/80">No messages yet</p>
                          <p className="text-xs text-foreground/50">Send a message to start the conversation</p>
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className={cn("flex", message.type === "sent" ? "justify-end" : "justify-start")}>
                            <MessageBubble message={message} />
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Input Area */}
                  <div className="px-3 py-3 bg-[#f0f2f5] shrink-0">
                    <div className="flex items-center gap-2 bg-white rounded-xl px-2 py-1.5 border border-slate-200">
                      <Button variant="ghost" size="sm" disabled title="Document upload coming soon" className="h-8 w-8 p-0 text-muted-foreground rounded-lg shrink-0 opacity-40 cursor-not-allowed">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" disabled title="Image upload coming soon" className="h-8 w-8 p-0 text-muted-foreground rounded-lg shrink-0 opacity-40 cursor-not-allowed">
                        <ImageIcon className="w-4 h-4" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 border-0 focus-visible:ring-0 text-sm h-8 bg-transparent"
                        disabled={isSending}
                      />
                      <Button
                        className="h-8 w-8 p-0 rounded-lg bg-green-600 hover:bg-green-700 text-white shrink-0"
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
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#ECE5DD" }}>
                  <div className="text-center">
                    <div className="h-16 w-16 rounded-xl border-2 border-slate-200 bg-white/80 flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-lg font-semibold text-foreground/80">No conversation selected</p>
                    <p className="text-sm text-foreground/50">Select a conversation from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>

            {/* ─── Contact Details Sidebar ─── */}
            <div className="w-72 border-l-2 border-slate-100 bg-white flex flex-col shrink-0 overflow-hidden">
              <div className="p-5 border-b border-slate-100 shrink-0">
                <h3 className="text-sm font-semibold text-foreground">Contact Details</h3>
              </div>

              {selectedConversation ? (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-5 space-y-6">
                    <div className="text-center">
                      <div className={cn(
                        "h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold",
                        getAvatarColor(selectedConversation.name)
                      )}>
                        {selectedConversation.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <h4 className="font-semibold text-foreground">{selectedConversation.name}</h4>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">Active</span>
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Phone Number</p>
                        <p className="font-mono text-sm text-foreground">{selectedConversation.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
                        {selectedConversation.tags && Array.isArray(selectedConversation.tags) && selectedConversation.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedConversation.tags.map((tag) => (
                              <Badge key={tag} className="bg-slate-100 text-slate-700 border-slate-200 text-xs font-mono">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No tags</span>
                        )}
                      </div>
                    </div>

                    <Separator className="bg-slate-100" />

                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">Quick Actions</p>
                      <Button variant="outline" className="w-full justify-start text-sm rounded-lg border-slate-200 h-9">
                        <Users className="w-4 h-4 mr-2" />
                        View Full Profile
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm rounded-lg border-slate-200 h-9">
                        <Archive className="w-4 h-4 mr-2" />
                        Archive Conversation
                      </Button>
                      <Button variant="outline" className="w-full justify-start text-sm rounded-lg border-slate-200 h-9">
                        <Star className="w-4 h-4 mr-2" />
                        Mark as VIP
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center p-5">
                  <p className="text-xs text-muted-foreground text-center">Select a conversation</p>
                </div>
              )}
            </div>
        </div>
    </StandardLayout>
  )
}