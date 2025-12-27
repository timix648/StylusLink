import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '../components/WalletContext'; 

export const metadata: Metadata = {
  title: 'StylusLink | AI-Gated Payments',
  description: 'Biometric & AI verification on Arbitrum Stylus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 1. Keep Hydration Warning suppression (Prevents extension errors)
    <html lang="en" suppressHydrationWarning>
      {/* 2. Apply Global Matrix Theme 
         - We remove 'Inter' so the 'Courier Prime' from globals.css takes over.
         - We add 'bg-black' to ensure the dark theme is seamless.
      */}
      <body className="bg-black text-white antialiased selection:bg-green-500 selection:text-black" suppressHydrationWarning>
        <WalletProvider>
            {/* NOTE: We removed <Navbar /> because the new page.tsx 
               has its own "Matrix Header" and "Creator Menu" built-in. 
            */}
            <main className="min-h-screen">
              {children}
            </main>
        </WalletProvider>
      </body>
    </html>
  );
}