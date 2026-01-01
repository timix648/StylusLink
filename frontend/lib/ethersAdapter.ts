'use client';

import { BrowserProvider, JsonRpcSigner } from 'ethers';
import { useMemo } from 'react';
import { useConnectorClient } from 'wagmi';

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

export function useEthersSigner({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient({ chainId });
  return useMemo(() => {
    if (!client) return undefined;
    return clientToSigner(client);
  }, [client]);
}

export function useEthersProvider({ chainId }: { chainId?: number } = {}) {
  const { data: client } = useConnectorClient({ chainId });
  return useMemo(() => {
    if (!client) return undefined;
    return clientToProvider(client);
  }, [client]);
}
