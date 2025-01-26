"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

type Message = {
  role: "user" | "ai"
  content: string
}

type Conversation = {
  id: string
  title: string
  lastMessage: string
}

const FuturisticChatInterface: React.FC = () => {
  const { publicKey } = useWallet()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [interfaceMode, setInterfaceMode] = useState<"traditional" | "immersive">("traditional")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Simulating fetching conversations
    setConversations([
      { id: "1", title: "Project Alpha", lastMessage: "Analyzing quantum algorithms..." },
      { id: "2", title: "Neural Networks", lastMessage: "Optimizing synaptic weights..." },
      { id: "3", title: "Data Synthesis", lastMessage: "Generating synthetic datasets..." },
    ])
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messagesEndRef])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulating AI response
    setTimeout(() => {
      const aiMessage: Message = { role: "ai", content: "Processing your request... [AI response simulation]" }
      setMessages((prev) => [...prev, aiMessage])
      setIsTyping(false)
    }, 1500)
  }

  const TypingIndicator = () => (
    <div className="flex space-x-2 p-3 bg-space-gray rounded-lg">
      <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse"></div>
      <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse delay-75"></div>
      <div className="w-3 h-3 bg-neon-blue rounded-full animate-pulse delay-150"></div>
    </div>
  )

  return (
    <div className={`h-screen flex flex-col ${interfaceMode === "immersive" ? "bg-dark-void" : "bg-space-gray"}`}>
      {!publicKey && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-neon-blue">Connect your wallet to access Dae AI</h2>
            <WalletMultiButton className="!bg-electric-violet !text-white hover:!bg-vivid-pink transition-colors" />
          </div>
        </div>
      )}
      {publicKey && (
        <>
          <header className="bg-dark-void p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-neon-blue">Dae AI Interface</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setInterfaceMode((mode) => (mode === "traditional" ? "immersive" : "traditional"))}
                className="px-4 py-2 bg-electric-violet text-white rounded-md hover:bg-vivid-pink transition-colors"
              >
                Toggle Interface
              </button>
              <WalletMultiButton className="!bg-electric-violet !text-white hover:!bg-vivid-pink transition-colors" />
            </div>
          </header>
          <div className="flex-grow flex overflow-hidden">
            <nav className="w-64 bg-space-gray p-4 overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4 text-neon-blue">Conversations</h2>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversation(conv.id)}
                  className={`w-full text-left p-2 rounded-md mb-2 transition-colors ${
                    activeConversation === conv.id
                      ? "bg-electric-violet text-white"
                      : "text-gray-300 hover:bg-deep-purple"
                  }`}
                >
                  <div className="font-semibold">{conv.title}</div>
                  <div className="text-sm truncate">{conv.lastMessage}</div>
                </button>
              ))}
            </nav>
            <main className="flex-grow flex flex-col p-4 overflow-hidden">
              <div className="flex-grow overflow-y-auto mb-4 space-y-4">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-3/4 p-3 rounded-lg ${
                          message.role === "user" ? "bg-electric-violet text-white" : "bg-space-gray text-neon-blue"
                        }`}
                      >
                        {message.content}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-grow p-2 rounded-l-md bg-space-gray text-white border-2 border-neon-blue focus:outline-none focus:ring-2 focus:ring-electric-violet"
                  placeholder="Type your message..."
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-electric-violet text-white rounded-r-md hover:bg-vivid-pink transition-colors"
                >
                  Send
                </button>
              </form>
            </main>
          </div>
        </>
      )}
    </div>
  )
}

export default FuturisticChatInterface

