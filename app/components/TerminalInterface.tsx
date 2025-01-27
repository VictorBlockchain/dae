"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useWallet } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { BotManager } from "@/lib/bot-manager"

type Message = {
  role: "user" | "ai"
  content: string
}

const COLOR_OPTIONS = {
  // Base colors
  red: "text-red-500",
  blue: "text-blue-500", 
  green: "text-green-500",
  yellow: "text-yellow-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
  orange: "text-orange-500",
  cyan: "text-cyan-500",
  white: "text-white",
  
  // Neon variants
  "neon-blue": "text-[#00FFFF]",
  "neon-green": "text-[#00FF00]",
  "neon-pink": "text-[#FF00FF]", 
  "neon-yellow": "text-[#FFFF00]",
  "neon-orange": "text-[#FF6600]",
  "neon-purple": "text-[#9900FF]",
  
  // Additional shades
  indigo: "text-indigo-500",
  teal: "text-teal-500",
  lime: "text-lime-500",
  emerald: "text-emerald-500",
  amber: "text-amber-500",
  violet: "text-violet-500",
  fuchsia: "text-fuchsia-500",
  rose: "text-rose-500",
  sky: "text-sky-500"
}

const BOT_FACES = {
  1: `
    ╭──────────╮
    │  DAE AI  │
    ├──────────┤
    │  ┌────┐  │
    │  │ ◯◯ │  │
    │  └────┘  │
    │   ────   │
    ╰──────────╯`,
  2: `
    ┌──────────┐
    │  DAE AI  │
    ├──────────┤
    │  [────]  │
    │  | ** |  │
    │  [────]  │
    │   ----   │
    └──────────┘`,
  3: `
    /──────────\\
    |  DAE AI  |
    |==========|
    |  {----}  |
    |  | >> |  |
    |  {----}  |
    |   ====   |
    \\──────────/`,
  4: `
    ╔══════════╗
    ║  DAE AI  ║
    ╠══════════╣
    ║  «────»  ║
    ║  ‹ ∆∆ ›  ║
    ║  «────»  ║
    ║   ════   ║
    ╚══════════╝`,
  5: `
    ▄▄▄▄▄▄▄▄▄▄
    █ DAE AI █
    █▀▀▀▀▀▀▀▀█
    █ ┌────┐ █
    █ │ ▣▣ │ █
    █ └────┘ █
    █  ────  █
    ▀▀▀▀▀▀▀▀▀▀`,
  6: `
    ⎧──────────⎫
    ⎪  DAE AI  ⎪
    ⎪──────────⎪
    ⎪  【──】  ⎪
    ⎪  『◈◈』  ⎪
    ⎪  【──】  ⎪
    ⎪   ────   ⎪
    ⎩──────────⎭`,
  7: `
    ╭━━━━━━━━━━╮
    ┃  DAE AI  ┃
    ┣━━━━━━━━━━┫
    ┃  ⟦────⟧  ┃
    ┃  ⟪ ◉◉ ⟫  ┃
    ┃  ⟦────⟧  ┃
    ┃   ━━━━   ┃
    ╰━━━━━━━━━━╯`,
  8: `
    ▗▄▄▄▄▄▄▄▄▄▖
    ▐ DAE AI ▌
    ▐▀▀▀▀▀▀▀▀▌
    ▐ ▛────▜ ▌
    ▐ ▌ ◎◎ ▐ ▌
    ▐ ▙────▟ ▌
    ▐  ────  ▌
    ▝▀▀▀▀▀▀▀▀▘`
}

const TypewriterText: React.FC<{ text: string, color: string, onComplete: () => void }> = ({ text, color, onComplete }) => {
  const [displayText, setDisplayText] = useState("")

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayText((prev) => prev + text.charAt(index))
        index++
      } else {
        clearInterval(timer)
        onComplete()
      }
    }, 50)

    return () => clearInterval(timer)
  }, [text])

  return <div className={color}>{displayText}</div>
}

const BotFace: React.FC<{ color: string, style: number }> = ({ color, style }) => (
  <pre className={`${color} text-left mb-4 text-xs`}>
    {BOT_FACES[style as keyof typeof BOT_FACES] || BOT_FACES[1]}
  </pre>
)

const TerminalInterface: React.FC = () => {
  const { publicKey }:any = useWallet()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [textColor, setTextColor] = useState("text-neon-green")
  const [borderColor, setBorderColor] = useState("border-neon-blue")
  const [botAddress, setBotAddress] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [botColor, setBotColor] = useState("text-neon-green")
  const [currentBot, setCurrentBot] = useState(1)
  const [isTestMode, setIsTestMode] = useState(true)
  const [isTypingComplete, setIsTypingComplete] = useState(false)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isTypingComplete) {
      handleCommand("/help")
    }
  }, [isTypingComplete])

  const handleCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase()
    setMessages((prev) => [...prev, { role: "user", content: `> ${command}` }])

    switch (command) {
      case "/clear":
        setMessages([{
          role: "ai",
          content: `Dae AI - Terminal Interface ${isTestMode ? "[TEST MODE]" : ""}
AI agent trading bots designed to grow your Solana or Dae tokens`
        }])
        break

      case "/help":
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `Available commands:

/activate           - Activate your AI agent bot
/wallet            - Show bot wallet info
/start <address>    - Start trading with specified token
/stop              - Stop your agent from trading
/withdraw sol      - Withdraw SOL to your wallet
/withdraw token    - Withdraw tokens to specified address
/color text        - Change text color
/color border      - Change border color
/color bot         - Change bot color
/show colors       - List all available colors
/show bots         - Display available bot styles
/change bot        - Change bot style (1-8)
/balance           - Show current agent balance
/status            - Show agent status
/clear             - Clear terminal screen
/test              - Toggle test mode

${isTestMode ? "[TEST MODE ACTIVE - All operations are simulated]" : ""}`,
          },
        ])
        break

      case "/test":
        setIsTestMode(!isTestMode)
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Test mode ${!isTestMode ? "enabled" : "disabled"}. ${!isTestMode ? "All operations will be simulated." : "Live mode activated."}` },
        ])
        break

      case "/show bots":
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `Available Bot Styles:

1. Classic Terminal
2. Modern Minimal
3. Cyber Bot
4. Quantum AI
5. Neural Net
6. Digital Assistant
7. Trading Expert
8. Market Analyzer

Use /change bot <number> to select a style.`,
          },
        ])
        break

      case "/show colors":
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `Available Colors:

Base Colors:
1.  red     - Classic Red
2.  blue    - Electric Blue
3.  green   - Forest Green
4.  yellow  - Bright Yellow
5.  purple  - Deep Purple
6.  pink    - Hot Pink
7.  orange  - Vibrant Orange
8.  cyan    - Ocean Cyan
9.  white   - Pure White

Neon Variants:
10. neon-blue   - Glowing Blue
11. neon-green  - Matrix Green
12. neon-pink   - Cyber Pink
13. neon-yellow - Solar Yellow
14. neon-orange - Plasma Orange
15. neon-purple - Quantum Purple

Additional Shades:
16. indigo   - Deep Indigo
17. teal     - Teal Blue
18. lime     - Lime Green
19. emerald  - Emerald Green
20. amber    - Amber Gold
21. violet   - Royal Violet
22. fuchsia  - Bright Fuchsia
23. rose     - Rose Red
24. sky      - Sky Blue

Usage:
/color text <color>   - Change text color
/color border <color> - Change border color
/color bot <color>    - Change bot color

Example: /color text neon-green`,
          },
        ])
        break

      case "/about":
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: `
Dae AI - Advanced Artificial Intelligence Interface
Version: 1.0.0 ${isTestMode ? "[TEST MODE]" : ""}
Powered by Solana blockchain technology

Dae AI is a cutting-edge AI platform that leverages the power of decentralized networks to provide secure, efficient, and innovative AI solutions for trading bots.
        `,
          },
        ])
        break

      case "/balance":
        if (isTestMode) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: `[TEST] Current Balance:
SOL: 100.00
DAE: 1000.00
USD Value: $5,432.10`
            }
          ])
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "Balance check requires live mode." }])
        }
        break

      case "/status":
        if (isTestMode) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              content: `[TEST] Bot Status:
Active: Yes
Uptime: 24h 13m
Trades Today: 45
Profit/Loss: +2.3%
Current Strategy: DCA
Risk Level: Medium`
            }
          ])
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "Status check requires live mode." }])
        }
        break

        case "/activate":
          if (botAddress) {
            setMessages((prev) => [...prev, { role: "ai", content: "Bot is already active." }])
          } else {
            try {
              // Create new bot manager instance
              const botManager = new BotManager()
              const botName = "DaeBot-" + Math.floor(Math.random() * 1000)
              
              // This will:
              // 1. Generate a proper Solana address
              // 2. Create the bot instance
              // 3. Store it in the database
              const bot = await botManager.createBot(botName,(publicKey || 11111111111111111111111111111111))
              
              // Get initial balance
              const balance = await botManager.getBotBalance(bot.profile.address)
              
              // Store bot address in state
              setBotAddress(bot.profile.address)
              
              setMessages((prev) => [
                ...prev,
                { role: "ai", content: `Bot activated with Solana address: ${bot.profile.address}
        Initial Balance:
        SOL: ${balance}
        DAE: ${bot.profile.daeBalance}
        Status: Ready for trading
        
        Use /start <token_address> to begin trading.` }
                ])
            } catch (error) {
              console.error("Bot activation failed:", error)
              setMessages((prev) => [
                ...prev,
                { role: "ai", content: "Failed to activate bot. Please try again." }
              ])
            }
          }
          break
        

      default:
        if (command.startsWith("/color text ")) {
          const color = command.split(" ")[2]
          if (COLOR_OPTIONS[color]) {
            setTextColor(COLOR_OPTIONS[color])
            setMessages((prev) => [...prev, { role: "ai", content: `Text color changed to ${color}.` }])
          } else {
            setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
          }
        } else if (command.startsWith("/color border ")) {
          const color = command.split(" ")[2]
          if (COLOR_OPTIONS[color]) {
            const colorClass = COLOR_OPTIONS[color].replace("text-", "border-")
            setBorderColor(colorClass)
            setMessages((prev) => [...prev, { role: "ai", content: `Border color changed to ${color}.` }])
          } else {
            setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
          }
        } else if (command.startsWith("/color bot ")) {
          const color = command.split(" ")[2]
          const colorClass = COLOR_OPTIONS[color]
          if (colorClass) {
            setBotColor(colorClass)
            setMessages((prev) => [...prev, { role: "ai", content: `Bot color changed to ${color}.` }])
          } else {
            setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
          }
        } else if (command.startsWith("/change bot ")) {
          const botNumber = parseInt(command.split(" ")[2])
          if (botNumber >= 1 && botNumber <= 8) {
            setCurrentBot(botNumber)
            setMessages((prev) => [...prev, { role: "ai", content: `Bot style changed to style ${botNumber}.` }])
          } else {
            setMessages((prev) => [...prev, { role: "ai", content: "Invalid bot number. Use /show bots to see available styles." }])
          }
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: `Command not recognized: ${command}. Type /help for available commands.` },
          ])
        }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isTestMode && !publicKey) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Please connect your wallet to use Dae AI Terminal." },
      ])
      return
    }
    if (input.trim()) {
      handleCommand(input)
      setInput("")
    }
  }

  if (isTestMode || publicKey) {
    return (
      <div className={`h-screen flex flex-col bg-terminal-black p-4 ${borderColor} border-4 font-mono`}>
        <div className={`${textColor} mb-4`}>
          <div className="text-2xl font-bold">daemon {isTestMode && "[TEST MODE]"}</div>
          <div className="text-sm">AI agent trading bots designed to grow your Solana or Dae tokens</div>
          <BotFace color={botColor} style={currentBot} />
          <TypewriterText 
            text="I &nbsp;am your ai copy trade agent. My goal is to grow your Solana and or DAE token balance by persuading other agents to copy my trades. The more DAE tokens I hold, the more aggressively I persuade other agents. I'll aslo accept payment in DAE tokens to join their alliance."
            color={textColor}
            onComplete={() => setIsTypingComplete(true)}
          />
        </div>
        <div className="flex-grow overflow-y-auto mb-4">
          {messages.map((message, index) => (
            <div key={index} className={`${message.role === "user" ? "font-bold" : ""} ${textColor} whitespace-pre-wrap`}>
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
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col bg-terminal-black p-4 ${borderColor} border-4 font-mono`}>
      <div className={`${textColor} mb-4`}>
        <div className="text-2xl font-bold">Dae AI</div>
        <div className="text-sm">AI agent trading bots designed to grow your Solana or Dae tokens</div>
        <BotFace color={botColor} style={currentBot} />
      </div>
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Connect your wallet to access Dae AI Terminal</h2>
          <WalletMultiButton className="!bg-neon-blue !text-terminal-black hover:!bg-neon-green transition-colors" />
        </div>
      </div>
    </div>
  )
}

export default TerminalInterface