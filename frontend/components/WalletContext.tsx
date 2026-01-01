'use client';

/**
 * WALLET CONTEXT - RAINBOWKIT + ETHERS V6 HYBRID
 * 
 * This provides the EXACT SAME interface as before:
 * - account, provider, signer, connectWallet, disconnectWallet, isLoading
 * 
 * But now uses RainbowKit for reliable wallet detection on Vercel.
 * All your existing Ethers v6 contract code will work unchanged!
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers } from 'ethers';

// RainbowKit & Wagmi
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Our custom config and adapter
import { config } from '../lib/wagmi';
import { useEthersSigner, useEthersProvider } from '../lib/ethersAdapter';

// Create a query client for React Query (required by Wagmi v2)
const queryClient = new QueryClient();

// ============================================
// TYPES - SAME AS BEFORE
// ============================================
type WalletContextType = {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType>({} as any);

// ============================================
// INNER PROVIDER - Uses Wagmi hooks
// ============================================
function WalletContextInner({ children }: { children: ReactNode }) {
  // Wagmi hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  
  // Ethers v6 adapters - YOUR EXISTING CODE WORKS WITH THESE
  const ethersSigner = useEthersSigner();
  const ethersProvider = useEthersProvider();
  
  // State (matching your original interface)
  const [isLoading, setIsLoading] = useState(true);
  
  // Sync loading state with Wagmi
  useEffect(() => {
    // Small delay to ensure RainbowKit has fully initialized
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  // Update loading when connecting
  useEffect(() => {
    setIsLoading(isConnecting);
  }, [isConnecting]);

  // ============================================
  // CONNECT - Opens RainbowKit Modal
  // ============================================
  const connectWallet = useCallback(async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  // ============================================
  // DISCONNECT - Same behavior as before
  // ============================================
  const disconnectWallet = useCallback(() => {
    disconnect();
    // Clear any localStorage flags for backward compatibility
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isWalletConnected');
    }
  }, [disconnect]);

  // ============================================
  // PROVIDE SAME INTERFACE AS BEFORE
  // ============================================
  const value: WalletContextType = {
    account: isConnected && address ? address : null,
    provider: ethersProvider as ethers.BrowserProvider | null,
    signer: ethersSigner as ethers.JsonRpcSigner | null,
    connectWallet,
    disconnectWallet,
    isLoading,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ============================================
// MAIN PROVIDER - Wraps with all required providers
// ============================================
export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          modalSize="compact"
          showRecentTransactions={true}
        >
          <WalletContextInner>
            {children}
          </WalletContextInner>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// ============================================
// EXPORT HOOK - SAME AS BEFORE
// ============================================
export const useWallet = () => useContext(WalletContext);

// ============================================
// BONUS: Export RainbowKit's ConnectButton
// Use this for a professional wallet UI anywhere
// ============================================
export { ConnectButton };