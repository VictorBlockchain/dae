/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  safelist: [
    // Base colors
    'text-red-500', 'border-red-500',
    'text-blue-500', 'border-blue-500',
    'text-green-500', 'border-green-500',
    'text-yellow-500', 'border-yellow-500',
    'text-purple-500', 'border-purple-500',
    'text-pink-500', 'border-pink-500',
    'text-orange-500', 'border-orange-500',
    'text-cyan-500', 'border-cyan-500',
    'text-white', 'border-white',
    
    // Additional shades
    'text-indigo-500', 'border-indigo-500',
    'text-teal-500', 'border-teal-500',
    'text-lime-500', 'border-lime-500',
    'text-emerald-500', 'border-emerald-500',
    'text-amber-500', 'border-amber-500',
    'text-violet-500', 'border-violet-500',
    'text-fuchsia-500', 'border-fuchsia-500',
    'text-rose-500', 'border-rose-500',
    'text-sky-500', 'border-sky-500',
  ],
  theme: {
    extend: {
      colors: {
        "neon-blue": "#00FFFF",
        "neon-green": "#00FF00",
        "neon-pink": "#FF00FF",
        "neon-yellow": "#FFFF00",
        "neon-orange": "#FF6600",
        "neon-purple": "#9900FF",
        "terminal-black": "#0C0C0C",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0 },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}