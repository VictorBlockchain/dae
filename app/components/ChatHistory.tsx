"use client"

import { useState, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { motion, AnimatePresence } from "framer-motion"

type ChatSession = {
  id: string
  agentAddress: string
  lastMessage: string
  timestamp: string
}

export default function ChatHistory() {
  const { publicKey } = useWallet()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])

  useEffect(() => {
    if (publicKey) {
      // Here you would typically fetch the chat history from your API
      const fakeChatSessions: ChatSession[] = [
        { id: "1", agentAddress: "Agent1", lastMessage: "Hello, how are you?", timestamp: "2023-05-01 10:00:00" },
        { id: "2", agentAddress: "Agent2", lastMessage: "What's the weather like?", timestamp: "2023-05-02 11:30:00" },
      ]
      setChatSessions(fakeChatSessions)
    }
  }, [publicKey])

  if (!publicKey) {
    return null
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4 text-primary">Chat History</h2>
      <AnimatePresence>
        {chatSessions.map((session, index) => (
          <motion.div
            key={session.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="bg-background-light p-4 rounded-lg shadow-md mb-4 hover:shadow-neon transition-shadow"
          >
            <p className="font-bold text-primary">{session.agentAddress}</p>
            <p className="text-text-muted">{session.lastMessage}</p>
            <p className="text-sm text-text-muted mt-2">{session.timestamp}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

