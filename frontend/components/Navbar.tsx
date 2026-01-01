'use client';
import { useWallet } from './WalletContext';

export default function Navbar() {
  const { account, connectWallet, disconnectWallet } = useWallet();

  return (
    <nav className="w-full border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          <img
            src="/op1.jpg"
            alt="StylusLink"
            className="w-8 h-8 rounded-lg object-cover"
            style={{ borderRadius: '8px' }}
          />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            StylusLink
          </span>
        </div>

        <div>
          {account ? (
            <div className="flex items-center gap-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-full px-4 py-1.5 flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-zinc-300 font-mono text-sm">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
              <button 
                onClick={disconnectWallet}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              className="bg-white text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-zinc-200 transition-all"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}