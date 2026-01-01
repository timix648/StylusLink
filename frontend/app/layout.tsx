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
    <html lang="en" suppressHydrationWarning>
      <body className="bg-black text-white antialiased selection:bg-green-500 selection:text-black" suppressHydrationWarning>
        <WalletProvider>
            <main className="min-h-screen">
              {children}
            </main>
        </WalletProvider>
      </body>
    </html>
  );
}