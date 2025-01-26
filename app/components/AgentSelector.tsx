"use client"

import { useState } from "react"
import { motion } from "framer-motion"

type Agent = {
  id: string
  name: string
}

export default function AgentSelector({ onSelect }: { onSelect: (agentId: string) => void }) {
  const [agents, setAgents] = useState<Agent[]>([
    { id: "1", name: "Agent Alpha" },
    { id: "2", name: "Agent Beta" },
    { id: "3", name: "Agent Gamma" },
  ])

  return (
    <div className="bg-background-light rounded-lg shadow-lg p-4 h-full">
      <h2 className="text-xl font-bold mb-4 text-primary">Select an Agent</h2>
      <ul className="space-y-2">
        {agents.map((agent) => (
          <motion.li key={agent.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button
              onClick={() => onSelect(agent.id)}
              className="w-full text-left px-4 py-2 rounded-md bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all duration-200"
            >
              {agent.name}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

