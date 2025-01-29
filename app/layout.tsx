import "./globals.css"
import { JetBrains_Mono } from "next/font/google"
import SolanaWalletProvider from "./components/SolanaWalletProvider"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
})

export const metadata = {
  title: "Daemon Ai - Terminal Interface",
  description: "Experience the future of AI communication with our Solana-powered terminal interface",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="bg-terminal-black">
        <SolanaWalletProvider>{children}</SolanaWalletProvider>
      </body>
    </html>
  )
}

