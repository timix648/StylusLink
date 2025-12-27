import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ADDED: The "Courier" Design System Colors
        matrix: {
          50: '#e0f2f1',  // Very Light Green (Text highlights)
          100: '#b9f6ca', // Light Green
          400: '#00e676', // THE "Matrix Green" (Main Action Color)
          500: '#00c853', // Darker Green (Borders)
          900: '#1b5e20', // Deep Jungle Green (Background gradients)
          black: '#0a0f0d', // Deep Black (Main Background)
        },
      },
      fontFamily: {
        // ADDED: Enforce the Monospace "Hacker" look
        mono: ['Courier Prime', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,50,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,50,0,0.1) 1px, transparent 1px)",
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite', // For the biometric scanner
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
};
export default config;