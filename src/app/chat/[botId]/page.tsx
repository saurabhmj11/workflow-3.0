'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Send, Bot, User, Loader2 } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'bot'
  content: string
}

export default function ChatWidgetPage() {
  const params = useParams()
  const botId = params.botId as string

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', content: 'Hi there! I am powered by OpenWorkflow. How can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botId,
          messages: [...messages, userMessage]
        })
      })

      const data = await response.json()
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        content: data.reply
      }
      setMessages(prev => [...prev, botMessage])
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'bot', content: 'Sorry, I encountered an error.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white dark:bg-zinc-950 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <div className="h-8 w-8 rounded-full bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">AI Assistant</h1>
          <p className="text-[10px] text-zinc-400">Powered by OpenWorkflow</p>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-linear-to-br from-violet-600 to-cyan-500'}`}>
                {msg.role === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
              </div>
              <div className={`px-4 py-2.5 rounded-lg text-sm shadow-xs ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-white rounded-tr-sm' 
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%] gap-2 flex-row">
              <div className="shrink-0 h-7 w-7 rounded-full bg-linear-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="px-4 py-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm shadow-xs rounded-tl-sm flex items-center">
                <Loader2 className="h-4 w-4 text-zinc-500 animate-spin" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full pl-4 pr-12 py-3 rounded-full bg-zinc-100 dark:bg-zinc-900 border-none focus:ring-2 focus:ring-violet-500 text-sm outline-hidden text-zinc-900 dark:text-white placeholder:text-zinc-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 h-9 w-9 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  )
}
