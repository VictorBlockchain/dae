"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { motion } from "framer-motion"

export default function ActivateAgent() {
  const { publicKey } = useWallet()
  const [agentAddress, setAgentAddress] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)

  const activateAgent = async () => {
    if (publicKey) {
      setIsActivating(true)
      // Here you would typically make an API call to generate a Solana address for the AI agent
      await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API call
      const fakeAgentAddress = "FakeAgentAddress123456789"
      setAgentAddress(fakeAgentAddress)
      setIsActivating(false)
    }
  }

  if (!publicKey) {
    return null
  }

  return (
    <div className="mb-8">
      {agentAddress ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background-light p-4 rounded-lg shadow-neon"
        >
          <p className="text-primary font-mono">Your AI agent is active:</p>
          <p className="text-text-muted font-mono break-all">{agentAddress}</p>
        </motion.div>
      ) : (
        <motion.button
          onClick={activateAgent}
          disabled={isActivating}
          className="w-full px-4 py-3 bg-secondary text-background rounded-lg hover:bg-secondary-dark transition-colors disabled:bg-secondary-dark disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isActivating ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-background"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Activating AI Agent...
            </span>
          ) : (
            "Activate AI Agent"
          )}
        </motion.button>
      )}
    </div>
  )
}

