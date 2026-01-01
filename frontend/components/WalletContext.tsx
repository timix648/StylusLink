'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ethers } from 'ethers';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '../lib/wagmi';
import { useEthersSigner, useEthersProvider } from '../lib/ethersAdapter';
const queryClient = new QueryClient();

type WalletContextType = {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType>({} as any);
function WalletContextInner({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const ethersSigner = useEthersSigner();
  const ethersProvider = useEthersProvider();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsLoading(isConnecting);
  }, [isConnecting]);

  const connectWallet = useCallback(async () => {
    if (openConnectModal) {
      openConnectModal();
    }
  }, [openConnectModal]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isWalletConnected');
    }
  }, [disconnect]);

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

export const useWallet = () => useContext(WalletContext);
export { ConnectButton };