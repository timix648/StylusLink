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
      <head>
        <link rel="icon" href="/op1.jpg?v=1" />
        <link rel="icon" type="image/jpeg" sizes="32x32" href="/op1.jpg?v=1" />
        <link rel="icon" type="image/jpeg" sizes="16x16" href="/op1.jpg?v=1" />
        <link rel="apple-touch-icon" href="/op1.jpg?v=1" />
        <link rel="shortcut icon" href="/op1.jpg?v=1" />
      </head>
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