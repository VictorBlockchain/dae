"use client"

import { useState, useEffect, useRef } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/components/ui/use-toast"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { connect } from "http2"
// import { BotManager } from "@/lib/bot-manager"

type Message = {
  role: "user" | "ai"
  content: string
}

const BOT_FACES:any = {
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

const COLOR_OPTIONS:any = {
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

const HELP_MESSAGE = `Available commands:

${process.env.ADMIN_SOLANA_ADDRESS ? `Admin Commands:
/set fee <amount>    - Set trading fee (e.g., 0.0005 SOL)
/set fee address     - Set fee collection address
/view settings       - View current admin settings

` : ''}General Commands:
/activate          - Activate your AI agent bot 1
/auto trade <address> - DCA every x minutes
/auto trade pump <address> - DCA every x minutes on pump
/balance           - Show current agent balance
/bot               - Display bot info
/buy               - Buy the active trading token
/buy <address>     - Buy a specific token
/change bot        - Change bot style (1-8)
/clear             - Clear terminal screen
/color border      - Change border color
/color bot         - Change bot color
/color text        - Change text color
/copy <address>    - Copy trades of this address 1
/uncopy <address>    - Stop copying trades of this address 1
/copy on           - Enable copy trading 1
/copy off          - Disable copy trading 1
/export private key - Export bot private key
/keyword add <word> - Search for tokens launched with this keyword in name or description 1
/keyword delete <word> - Delete keyword 1
/keyword trades on/off   - Enable/disable new listing based on keywords detection 1
/mev on/off        - Toggle MEV protection 
/priority fee <num>    - Set priority fee ie 0.0001 1
/sell <amount>     - Sell specified amount of tokens
/sell all          - Sell entire token balance
/show bots         - Display available bot styles
/show colors       - List all available colors
/slippage <amount> - Set slippage tolerance (0.1-5.0%) 1
/start auto trade  - Start auto trading set token
/status            - Show agent status
/stop  auto trade  - Stop auto trades
/stop loss <num>   - Set stop loss percentage
/take profit <num> - Set take profit percentage
/trade address <address> - Token address to buy or auto trade
/test              - Toggle test mode
/wallet            - Show bot wallet info
/withdraw sol      - Withdraw SOL to your wallet
/withdraw token    - Withdraw tokens to specified address`

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

const BotFace = ({ color, style }:any) => (
  <pre className={`${color} text-left mb-4 text-xs`}>
    {BOT_FACES[style] || BOT_FACES[1]}
  </pre>
)

export default function TerminalInterface() {
  const { disconnect, publicKey, connected }:any = useWallet()  
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [botAddress, setBotAddress] = useState<string | null>(null)
  const [isTestMode, setIsTestMode] = useState(false)
  const [textColor, setTextColor] = useState("text-neon-green")
  const [borderColor, setBorderColor] = useState("border-neon-blue")
  const [botColor, setBotColor] = useState("text-neon-green")
  const [currentBot, setCurrentBot] = useState(1)
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>()
  const { toast } = useToast()

  useEffect(() => {

    if (connected) {
      setUser(publicKey.toBase58())
      toast({
        title: "Connected",
        description: "You have successfully connected your wallet",
        // status: "success",
      })
    }
  }, [connected])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleCommand = async (command: string) => {
    setMessages((prev) => [...prev, { role: "user", content: `> ${command}` }])

    switch (true) {
            // Admin commands
            case command.startsWith("/set fee address"): {
              if (publicKey?.toString() !== process.env.ADMIN_SOLANA_ADDRESS) {
                setMessages(prev => [...prev, { role: "ai", content: "Unauthorized: Admin access required" }])
                break
              }
      
              const feeAddress = command.split("/set fee address")[1].trim()
              if (!feeAddress) {
                setMessages(prev => [...prev, { role: "ai", content: "Please specify a fee collection address" }])
                break
              }
      
              try {
                const response = await fetch("/api/admin/set/fee-address", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user: user,
                    value: feeAddress
                  })
                })
                console.log(response)
                if (!response.ok) {
                  throw new Error("Failed to update fee address")
                }
      
                setMessages(prev => [...prev, { role: "ai", content: `Fee address updated successfully to ${feeAddress}` }])
              } catch (error) {
                setMessages(prev => [...prev, { role: "ai", content: "Failed to update fee address" }])
              }
              break
            }
      
            case command.startsWith("/set fee"): {
              if (publicKey?.toString() !== process.env.ADMIN_SOLANA_ADDRESS) {
                setMessages(prev => [...prev, { role: "ai", content: "Unauthorized: Admin access required" }])
                break
              }
      
              const feeStr = command.split("/set fee")[1].trim()
              if (!feeStr || command.includes("address")) {
                setMessages(prev => [...prev, { role: "ai", content: "Please specify a fee amount in SOL" }])
                break
              }
      
              const feeAmount = parseFloat(feeStr)
              if (isNaN(feeAmount) || feeAmount < 0) {
                setMessages(prev => [...prev, { role: "ai", content: "Invalid fee amount. Please enter a valid number greater than 0" }])
                break
              }
      
              try {
                const response = await fetch("/api/admin/set/fee", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user: publicKey.toString(),
                    value: feeAmount
                  })
                })
                console.log(response)
                if (!response.ok) {
                  throw new Error("Failed to update fee")
                }
      
                setMessages(prev => [...prev, { role: "ai", content: `Trading fee updated to ${feeAmount} SOL` }])
              } catch (error) {
                setMessages(prev => [...prev, { role: "ai", content: "Failed to update trading fee" }])
              }
              break
            }
      
            case command === "/view settings": {
              if (publicKey?.toString() !== process.env.ADMIN_SOLANA_ADDRESS) {
                setMessages(prev => [...prev, { role: "ai", content: "Unauthorized: Admin access required" }])
                break
              }
      
              try {
                const response = await fetch(`/api/admin/get/settings?user=${user}`)
                if (!response.ok) {
                  throw new Error("Failed to get settings")
                }
      
                const data = await response.json()
                let settings:any = JSON.stringify(data.message)
                console.log(settings)
                let settingsDisplay = Object.entries(data.message)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
      
                setMessages(prev => [...prev, { 
                  role: "ai", 
                  content: `Current Settings:\n${settingsDisplay}`
                }])
              } catch (error) {
                setMessages(prev => [...prev, { role: "ai", content: "Failed to get settings" }])
              }
              break
            }
            case command === "/off": {  
            
              disconnect() 
              setMessages(prev => [...prev, { 
                role: "ai", 
                content: `Disconnected from Daemon`
              }])
            }

            case command === "/bot": {
            
              try {
                const response = await fetch(`/api/bot/get?user=${user}`)
                const data = await response.json()
                if (!data.success) {
                  throw new Error("Failed to get bot")
                }
              
                const bot = data.message
                setBotAddress(bot.publicKey)
                setMessages((prev) => [
                  ...prev,
                  { role: "ai", content: `Bot activated with Solana address: ${bot.publicKey}
          Initial Balance:
          SOL: 0
          DAE: 0
          Status: Ready for trading
          
          Use /trade address <token_address> to set the address you want traded.` }
                  ])
              } catch (error) {
                setMessages(prev => [...prev, { role: "ai", content: "Failed to get private key" }])
              }
              break
            }
      
            case command === "/export private key": {
              if (!botAddress) {
                setMessages(prev => [...prev, { role: "ai", content: "No active bot. Use /activate to create one first." }])
                break
              }
      
              try {
                const response = await fetch(`/api/bot/keys?user=${user}`)
                const data = await response.json()
                console.log(data)
                if (!data.success) {
                  throw new Error("Failed to get private key")
                }
              
                setMessages(prev => [...prev, { 
                  role: "ai", 
                  content: `Private Key: ${data.privateKey}\n\nThis message will be deleted in 15 seconds.` 
                }])
      
                // Delete the message after 30 seconds
                setTimeout(() => {
                  setMessages(prev => prev.slice(0, -1))
                }, 15000)
              } catch (error) {
                setMessages(prev => [...prev, { role: "ai", content: "Failed to get private key" }])
              }
              break
            }
      case command === "/help":
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: HELP_MESSAGE }
        ])
        break
      
      case command === "/clear":
        setMessages([{
          role: "ai",
          content: `Dae AI - Terminal Interface ${isTestMode ? "[TEST MODE]" : ""}
AI agent trading bots designed to grow your Solana or Dae tokens`
        }])
        break
    
      case command === "/view settings": {
        if (publicKey?.toString() !== process.env.ADMIN_SOLANA_ADDRESS) {
          setMessages(prev => [...prev, { role: "ai", content: "Unauthorized: Admin access required" }])
          break
        }

        try {
          const response = await fetch(`/api/admin/settings?wallet=${publicKey.toString()}`)
          const data = await response.json()

          if (!response.ok) {
            throw new Error("Failed to get settings")
          }

          const settingsText = data.settings.map((s: any) => 
            `${s.key}: ${s.value}`
          ).join('\n')

          setMessages(prev => [...prev, { 
            role: "ai", 
            content: `Current Settings:\n${settingsText}` 
          }])
        } catch (error) {
          setMessages(prev => [...prev, { role: "ai", content: "Failed to get settings" }])
        }
        break
      }

      case command === "/activate":
        if (botAddress) {
          setMessages((prev) => [...prev, { role: "ai", content: "Bot is already active." }])
        } else {
          try {
            // Create new bot manager instance
            const botName = "Daemon-" + Math.floor(Math.random() * 1000)
            // This will:
            // 1. Generate a proper Solana address
            // 2. Create the bot instance
            // 3. Store it in the database
            // console.log("user",user)
            const response:any = await fetch("/api/bot/activate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user:user,
                botName: botName
              })
            })
            const data = await response.json();
            
            if (!data.success) {
              throw new Error("Failed to activate bot")
            }
            const bot = data.message
            setBotAddress(bot.publicKey)
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: `Bot activated with Solana address: ${bot.publicKey}
      Initial Balance:
      SOL: 0
      DAE: 0
      Status: Ready for trading
      
      Use /trade address <token_address> to set the address you want traded.` }
              ])
          } catch (error) {
            console.error("Bot activation failed:", error)
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: "Failed to activate bot. Please try again later" }
            ])
          }
        }
        break
      
        case command.startsWith("/trade address"): {
          try {
            const address = command.split(" ")[2]
            const response:any = await fetch("/api/bot/set/trade-address", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user: user,
                address: address
              })
            })
            const data = await response.json();            
            if (!data.success) {
              throw new Error("Failed to set trade address")
            }
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: `${data.message}` }
              ])
          } catch (error:any) {
            
          }
        }
        
        case command.startsWith("/slippage"): {
        
        const slippage = command.split(" ")[1]
        const response:any = await fetch("/api/bot/set/slippage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: user,
            slippage: slippage
          })
        })
        
        const data = await response.json();        
        if (!data.success) {
          throw new Error("Failed to set slippage")
        }
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `${data.message}` }
          ])
          break
        }

      case command.startsWith("/priority fee"): {
    
        const priority = command.split(" ")[2]
        const response:any = await fetch("/api/bot/set/priority", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user: user,
            priority: priority
          })
        })
        const data = await response.json();
        
        if (!data.success) {
          throw new Error("Failed to set slippage")
        }
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `${data.message}` }
          ])
          break
        }

        case command.startsWith("/copy"): {
    
          const address = command.split(" ")[1]
          const response:any = await fetch("/api/bot/set/copy-address", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user: user,
              address: address
            })
          })
          const data = await response.json();
        
          if (!data.success) {
            throw new Error("Failed to set slippage")
          }
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: `${data.message}` }
            ])
            break
          }

          case command.startsWith("/uncopy"): {
    
            const address = command.split(" ")[1]
            const response:any = await fetch("/api/bot/set/copy-address-stop", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user: user,
                address: address
              })
            })
            const data = await response.json();
        
            if (!data.success) {
              throw new Error("Failed to set slippage")
            }
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: `${data.message}` }
              ])
              break
            }

          case command === "/copy on":{    
            
            const response:any = await fetch("/api/bot/set/copy-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user: user,
                status: 1
              })
            })
            const data = await response.json();
        
            if (!data.success) {
              throw new Error("Failed to set slippage")
            }
            setMessages((prev) => [
              ...prev,
              { role: "ai", content: `${data.message}` }
              ])
              break
            }
            
            case command === "/copy off":{    
            
              const response:any = await fetch("/api/bot/set/copy-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user: user,
                  status: 0
                })
              })
              
              const data = await response.json();
        
              if (!data.success) {
                throw new Error("Failed to set slippage")
              }
              setMessages((prev) => [
                ...prev,
                { role: "ai", content: `${data.message}` }
                ])
                break
              }
              
              case command.startsWith("/keyword add"): {
    
                const word = command.split(" ")[2]
                const response:any = await fetch("/api/bot/set/keyword", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    user: user,
                    word: word
                  })
                })
                
                const data = await response.json();
        
                if (!data.success) {
                  throw new Error("Failed to set slippage")
                }
                setMessages((prev) => [
                  ...prev,
                  { role: "ai", content: `${data.message}` }
                  ])
                  break
                }

                case command.startsWith("/keyword delete"): {
    
                  const word = command.split(" ")[2]
                  const response:any = await fetch("/api/bot/set/keyword-delete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      user: user,
                      word: word
                    })
                  })
                  
                  const data = await response.json();
        
                  if (!data.success) {
                    throw new Error("Failed to set slippage")
                  }
                  setMessages((prev) => [
                    ...prev,
                    { role: "ai", content: `${data.message}` }
                    ])
                    break
                  }

                  case command.startsWith("/keyword trades"): {
    
                    const status = command.split(" ")[2]
                      
                    const response:any = await fetch("/api/bot/set/keyword-status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        user: user,
                        status: status
                      })
                    })
                    const data = await response.json();
        
                    if (!data.success) {
                      throw new Error("Failed to set slippage")
                    }
                    setMessages((prev) => [
                      ...prev,
                      { role: "ai", content: `${data.message}` }
                      ])
                      break
                    }

      case command.startsWith("/color text"): {
        const color = command.split(" ")[2]
        if (COLOR_OPTIONS[color]) {
          setTextColor(COLOR_OPTIONS[color])
          setMessages((prev) => [...prev, { role: "ai", content: `Text color changed to ${color}.` }])
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
        }
        break
      }

      case command.startsWith("/color border"): {
        const color = command.split(" ")[2]
        if (COLOR_OPTIONS[color]) {
          const colorClass = COLOR_OPTIONS[color].replace("text-", "border-")
          setBorderColor(colorClass)
          setMessages((prev) => [...prev, { role: "ai", content: `Border color changed to ${color}.` }])
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
        }
        break
      }

      case command.startsWith("/color bot"): {
        const color = command.split(" ")[2]
        const colorClass = COLOR_OPTIONS[color]
        if (colorClass) {
          setBotColor(colorClass)
          setMessages((prev) => [...prev, { role: "ai", content: `Bot color changed to ${color}.` }])
        } else {
          setMessages((prev) => [...prev, { role: "ai", content: "Invalid color. Use /show colors to see available options." }])
        }
        break
      }

      case command === "/show colors":
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
/color bot <color>    - Change bot color`
          }
        ])
        break

      case command === "/test":
        setIsTestMode(!isTestMode)
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Test mode ${!isTestMode ? "enabled" : "disabled"}. ${!isTestMode ? "All operations will be simulated." : "Live mode activated."}` },
        ])
        break

      default:
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: `Command not recognized: ${command}. Type /help for available commands.` },
        ])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isTestMode && !publicKey) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Please connect your wallet to use Dae AI Terminal." },
      ])
      return
    }
    if (input.trim()) {
      await handleCommand(input)
      setInput("")
    }
  }
  
  if (!isTestMode && !connected) {
    return (
      <div className={`h-screen flex flex-col bg-terminal-black p-4 ${borderColor} border-4 font-mono`}>
        <div className={`${textColor} mb-4`}>
          <div className="text-2xl font-bold">DAEMON v1</div>
          <div className="text-sm">AI agent trading bots designed to grow your Solana or Dae tokens</div>
          <BotFace color={botColor} style={currentBot} />
          <TypewriterText 
            text="status: disconnected"
            color={textColor}
            onComplete={() => setIsTypingComplete(true)}
          /> 
        </div>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>Connect your wallet to access Dae AI Terminal</h2>
            <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !text-background !font-bold !py-2 !px-4 !rounded-full !shadow-lg hover:!shadow-xl !transition-all !duration-200 !transform hover:!scale-105" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-screen flex flex-col bg-terminal-black p-4 ${borderColor} border-4 font-mono`}>
      <div className={`${textColor} mb-4`}>
        <div className="text-2xl font-bold">DAEMON v1 {isTestMode && "[TEST MODE]"}</div>
        <div className="text-sm">AI agent trading bots designed to grow your Solana or Dae tokens</div>
        <BotFace color={botColor} style={currentBot} />
        {/* <p color={textColor}>I &nbsp;am your ai copy trade agent. My goal is to grow your Solana and or DAE token balance by persuading other agents to copy my trades. The more DAE tokens I hold, the more aggressively I persuade other agents. I'll aslo accept payment in DAE tokens to join their alliance.<br/><br/> type /help to get started</p> */}
          
          <TypewriterText 
            text="I &nbsp;am your ai copy trade agent. My goal is to grow your Solana and or DAE token balance by persuading other agents to copy my trades. The more DAE tokens I hold, the more aggressively I persuade other agents. I'll aslo accept payment in DAE tokens to join their alliance.type /help to get started"
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
        <div className="flex items-center">
          <span className={`${textColor} mr-2`}>{">"}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSubmit(e)
              }
            }}
            className={`flex-grow bg-transparent ${textColor} focus:outline-none`}
            autoFocus
          />
          {/* <span className={`${textColor} animate-blink`}>_</span> */}
        </div>
      </div>
    </div>
  )
}