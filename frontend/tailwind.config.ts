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
        matrix: {
          50: '#e0f2f1',  
          100: '#b9f6ca', 
          400: '#00e676', 
          500: '#00c853', 
          900: '#1b5e20', 
          black: '#0a0f0d', 
        },
      },
      fontFamily: {
        mono: ['Courier Prime', 'Courier New', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0,50,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,50,0,0.1) 1px, transparent 1px)",
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite', 
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