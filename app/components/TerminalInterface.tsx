"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"

type Message = {
  content: string
  isCommand?: boolean
}

const BotFace: React.FC<{ color: string }> = ({ color }) => (
  <pre className={`${color} text-left mb-4`}>
    {`
 ___________
| DAE AI     |
|  _______   |
| |  ___  |  |
| | |   | |  |
| | | ◯ | |  |
| | |___| |  |
| |_______|  |
|   _____    |
|  |     |   |
|  |_____|   |
|___________|
    `}
  </pre>
)

const TerminalInterface: React.FC = () => {
  const { publicKey } = useWallet()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [textColor, setTextColor] = useState("text-neon-green")
  const [borderColor, setBorderColor] = useState("border-neon-blue")
  const [botAddress, setBotAddress] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [blinkEyes, setBlinkEyes] = useState(false)

  useEffect(() => {
    if (publicKey) {
      handleCommand("/help")
    }
  }, [publicKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messagesEndRef]) //Corrected dependency

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlinkEyes((prev) => !prev)
    }, 3000)

    return () => clearInterval(blinkInterval)
  }, [])

  const handleCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase()
    setMessages((prev) => [...prev, { content: `> ${command}`, isCommand: true }])

    switch (command) {
      case "/help":
        setMessages((prev) => [
          ...prev,
          {
            content: `
Available commands:
/help - Show this help message
/about - Show information about Dae AI
/social - Show social media links
/show_history - Show chat history
/clear - Clear the terminal
/color text <color> - Change text color (e.g., /color text neon-blue)
/color border <color> - Change border color (e.g., /color border neon-pink)
/start - Activate the bot
/wallet - Show bot's wallet balance
        `,
          },
        ])
        break
      case "/about":
        setMessages((prev) => [
          ...prev,
          {
            content: `
Dae AI - Advanced Artificial Intelligence Interface
Version: 1.0.0
Powered by Solana blockchain technology

Dae AI is a cutting-edge AI platform that leverages the power of decentralized networks to provide secure, efficient, and innovative AI solutions for trading bots.
        `,
          },
        ])
        break
      case "/social":
        setMessages((prev) => [
          ...prev,
          {
            content: `
Follow us on social media:
Twitter: @DaeAI
GitHub: github.com/DaeAI
Discord: discord.gg/DaeAI
        `,
          },
        ])
        break
      case "/show_history":
        try {
          const history = await fetch("/api/chat-history").then((res) => res.json())
          setMessages((prev) => [
            ...prev,
            { content: `Chat History:\n${history.map((msg: string) => `- ${msg}`).join("\n")}` },
          ])
        } catch (error) {
          setMessages((prev) => [...prev, { content: "Failed to fetch chat history. Please try again later." }])
        }
        break
      case "/clear":
        setMessages([])
        break
      case "/start":
        if (botAddress) {
          setMessages((prev) => [...prev, { content: "Bot is already active." }])
        } else {
          const newAddress = "Sol" + Math.random().toString(36).substring(2, 15)
          setBotAddress(newAddress)
          setMessages((prev) => [...prev, { content: `Bot activated. Solana address: ${newAddress}` }])
        }
        break
      case "/wallet":
        if (botAddress) {
          try {
            const balance = await fetch("/api/wallet-balance").then((res) => res.json())
            setMessages((prev) => [
              ...prev,
              {
                content: `
Bot Wallet Balance:
Solana: ${balance.solana} SOL
Dae: ${balance.dae} DAE
            `,
              },
            ])
          } catch (error) {
            setMessages((prev) => [...prev, { content: "Failed to fetch wallet balance. Please try again later." }])
          }
        } else {
          setMessages((prev) => [...prev, { content: "Bot is not active. Use /start to activate the bot." }])
        }
        break
      default:
        if (command.startsWith("/color")) {
          const [, type, color] = command.split(" ")
          if (type === "text" && color) {
            setTextColor(`text-${color}`)
            setMessages((prev) => [...prev, { content: `Text color changed to ${color}.` }])
          } else if (type === "border" && color) {
            setBorderColor(`border-${color}`)
            setMessages((prev) => [...prev, { content: `Border color changed to ${color}.` }])
          } else {
            setMessages((prev) => [
              ...prev,
              { content: "Invalid color command. Use /color text <color> or /color border <color>" },
            ])
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { content: `Command not recognized: ${command}. Type /help for available commands.` },
          ])
        }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      handleCommand(input)
      setInput("")
    }
  }

  return (
    <div className={`h-screen flex flex-col bg-terminal-black p-4 ${borderColor} border-4 font-mono`}>
      <div className={`${textColor} mb-4`}>
        <div className="text-2xl font-bold">Dae AI</div>
        <div className="text-sm">AI agent trading bots designed to grow your Solana or Dae tokens</div>
        <BotFace color={textColor} />
      </div>
      {!publicKey ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Connect your wallet to access Dae AI Terminal</h2>
            <WalletMultiButton className="!bg-neon-blue !text-terminal-black hover:!bg-neon-green transition-colors" />
          </div>
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-y-auto mb-4">
            {messages.map((message, index) => (
              <div key={index} className={`${message.isCommand ? "font-bold" : ""} ${textColor}`}>
                {message.content}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={handleSubmit} className="flex">
            <span className={`${textColor} mr-2`}>{">"}</span>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={`flex-grow bg-transparent ${textColor} focus:outline-none`}
              autoFocus
            />
          </form>
        </>
      )}
    </div>
  )
}

export default TerminalInterface

