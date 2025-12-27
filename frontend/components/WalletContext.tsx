'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';

type WalletContextType = {
  account: string | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType>({} as any);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Check if already connected on load
  useEffect(() => {
    const checkConnection = async () => {
      const { ethereum } = window as any;
      if (ethereum && ethereum.selectedAddress) {
        await connectWallet();
      }
      setIsLoading(false);
    };
    checkConnection();
  }, []);

  const connectWallet = async () => {
    try {
      const { ethereum } = window as any;
      if (!ethereum) {
        alert("Please install MetaMask");
        return;
      }

      // Switch Network to Arbitrum Sepolia
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x66eee' }], // 421614
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
            await ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x66eee',
                    chainName: 'Arbitrum Sepolia',
                    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                    blockExplorerUrls: ['https://sepolia.arbiscan.io/'],
                }],
            });
        }
      }

      const browserProvider = new ethers.BrowserProvider(ethereum);
      const newSigner = await browserProvider.getSigner();
      
      setAccount(newSigner.address);
      setProvider(browserProvider);
      setSigner(newSigner);

    } catch (error) {
      console.error("Connection failed", error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  };

  return (
    <WalletContext.Provider value={{ account, provider, signer, connectWallet, disconnectWallet, isLoading }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);