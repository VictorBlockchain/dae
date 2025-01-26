"use client"

import Link from "next/link"
import { useState } from "react"
import { motion } from "framer-motion"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Brain, Shield, FileText } from "lucide-react"

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const { publicKey } = useWallet()

  const navItems = [
    { href: "/about", label: "About", icon: Brain },
    { href: "/privacy", label: "Privacy", icon: Shield },
    { href: "/terms", label: "Terms", icon: FileText },
  ]

  const NavItem = ({ href, label, icon: Icon }) => (
    <Link href={href} className="group">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/40 hover:to-secondary/40 transition-all duration-300"
      >
        <Icon className="w-5 h-5 text-primary group-hover:text-secondary transition-colors duration-300" />
        <span className="text-text group-hover:text-primary transition-colors duration-300">{label}</span>
      </motion.div>
    </Link>
  )

  return (
    <header className="bg-background-light shadow-md">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold">
          <motion.span
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary animate-gradient"
          >
            Dae Ai
          </motion.span>
        </Link>
        <div className="hidden md:flex space-x-4 items-center">
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !text-background !font-bold !py-2 !px-4 !rounded-full !shadow-lg hover:!shadow-xl !transition-all !duration-200 !transform hover:!scale-105" />
        </div>
        <button
          className="md:hidden text-text hover:text-primary transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </nav>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:hidden bg-background-light py-2 px-4 space-y-2"
        >
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
          <div className="mt-4">
            <WalletMultiButton className="!bg-gradient-to-r !from-primary !to-secondary !text-background !font-bold !py-2 !px-4 !rounded-full !shadow-lg hover:!shadow-xl !transition-all !duration-200 !transform hover:!scale-105 !w-full" />
          </div>
        </motion.div>
      )}
    </header>
  )
}

