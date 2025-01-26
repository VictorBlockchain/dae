"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import AgentSelector from "./AgentSelector"

type Message = {
  role: "user" | "ai"
  content: string
}

export default function ChatInterface() {
  const { publicKey } = useWallet()
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(scrollToBottom, [messagesEndRef])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!publicKey) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to chat with Dae Ai.",
        variant: "destructive",
      })
      return
    }
    if (!selectedAgent) {
      toast({
        title: "No agent selected",
        description: "Please select an agent to chat with.",
        variant: "destructive",
      })
      return
    }
    if (input.trim()) {
      setIsLoading(true)
      setMessages((prev) => [...prev, { role: "user", content: input }])
      setInput("")

      // Simulate AI response (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: `This is a simulated AI response from Agent ${selectedAgent}.` },
      ])

      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)]">
      <div className="w-1/4 mr-4">
        <AgentSelector onSelect={setSelectedAgent} />
      </div>
      <div className="flex-grow flex flex-col bg-background-light rounded-lg shadow-lg overflow-hidden">
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
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
                    message.role === "user"
                      ? "bg-gradient-to-r from-primary to-secondary text-background"
                      : "bg-gradient-to-r from-secondary to-primary text-background"
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-background text-primary animate-pulse">
                AI is thinking...
              </span>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="p-4 bg-background">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-grow p-2 rounded-l-lg bg-background-light text-text border-2 border-primary focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type your message..."
              disabled={isLoading || !selectedAgent}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-r-lg bg-gradient-to-r from-primary to-secondary text-background hover:from-primary-dark hover:to-secondary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedAgent}
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

