'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'StylusLink',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [arbitrumSepolia, arbitrum],
  ssr: true,
});

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
