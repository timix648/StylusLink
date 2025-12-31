'use client';
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  // --- 1. CORE UPDATE LOGIC ---
  const updateAuth = useCallback(async (accounts: string[]) => {
    if (typeof window === 'undefined') return;
    const { ethereum } = window as any;

    // CHECK: Retrieve the persistence flag
    const isExplicitlyConnected = localStorage.getItem('isWalletConnected') === 'true';

    // UPDATED CONDITION: We now check "&& isExplicitlyConnected"
    // This prevents auto-connection if the user previously disconnected.
    if (accounts.length > 0 && ethereum && isExplicitlyConnected) {
      try {
        const browserProvider = new ethers.BrowserProvider(ethereum);
        const newSigner = await browserProvider.getSigner();

        console.log("Wallet Active:", newSigner.address);

        setProvider(browserProvider);
        setSigner(newSigner);
        setAccount(newSigner.address);
      } catch (e) {
        console.error("Error syncing wallet state:", e);
        setAccount(null);
        setProvider(null);
        setSigner(null);
      }
    } else {
      // User disconnected or locked wallet
      console.log("Wallet Disconnected");
      setAccount(null);
      setProvider(null);
      setSigner(null);
    }
  }, []);

  // --- 2. EVENT LISTENERS (Race Condition Fix) ---
  useEffect(() => {
    const init = async () => {
      // ⏳ WAIT 500ms for MetaMask to inject itself (Vercel Fix)
      await new Promise(resolve => setTimeout(resolve, 500));

      const { ethereum } = window as any;
      if (ethereum) {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        await updateAuth(accounts);

        // Setup listeners (MOVED INSIDE HERE TO WAIT FOR DELAY)
        ethereum.on('accountsChanged', updateAuth);
        ethereum.on('chainChanged', () => window.location.reload());
      } else {
        console.log("MetaMask not found after wait");
      }
      setIsLoading(false);
    };

    init();

    // Cleanup listeners on unmount
    return () => {
      const { ethereum } = window as any;
      if (ethereum && ethereum.removeListener) {
        ethereum.removeListener('accountsChanged', updateAuth);
      }
    };
  }, [updateAuth]);


  // --- 3. CONNECT ACTION ---
  const connectWallet = async () => {
    try {
      const { ethereum } = window as any;
      if (!ethereum) {
        alert("Please install MetaMask");
        return;
      }

      setIsLoading(true);

      // (Network switching logic)
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x66eee' }], // 421614
        });
      } catch (switchError: any) {
         // Ignore switch errors
      }

      // Request Account Access
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

      // ADDED: Set the persistence flag so updateAuth allows the connection
      localStorage.setItem('isWalletConnected', 'true');

      await updateAuth(accounts);

    } catch (error) {
      console.error("Connection failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. DISCONNECT ACTION ---
  const disconnectWallet = () => {
    // ADDED: Remove the persistence flag so refreshing the page won't reconnect
    localStorage.removeItem('isWalletConnected');

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