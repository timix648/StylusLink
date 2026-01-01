'use client';

/**
 * ETHERS V6 ADAPTER FOR WAGMI/RAINBOWKIT
 * 
 * This hook converts Wagmi's internal client to an Ethers v6 Signer.
 * This allows you to keep using all your existing Ethers v6 contract logic
 * while benefiting from RainbowKit's professional wallet UI.
 * 
 * Usage: const signer = useEthersSigner();
 */

import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { useMemo } from 'react';
import { useConnectorClient } from 'wagmi';

// Convert a Wagmi Client to an Ethers v6 Signer
function clientToSigner(client: any) {
  const { account, chain, transport } = client;
  if (!chain || !account) return undefined;
  
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

// Convert a Wagmi Client to an Ethers v6 Provider
function clientToProvider(client: any) {
  const { chain, transport } = client;
  if (!chain) return undefined;
  
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  return new BrowserProvider(transport, network);
}

/**
 * Hook to get an Ethers v6 Signer from Wagmi
 * Returns undefined if not connected
 */
export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient({ chainId });
  return useMemo(() => {
    if (!client) return undefined;
    return clientToSigner(client);
  }, [client]);
}

/**
 * Hook to get an Ethers v6 Provider from Wagmi
 * Returns undefined if not connected
 */
export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient({ chainId });
  return useMemo(() => {
    if (!client) return undefined;
    return clientToProvider(client);
  }, [client]);
}
