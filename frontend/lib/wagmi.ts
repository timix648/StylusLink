'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, arbitrum } from 'wagmi/chains';

// RainbowKit Configuration for StylusLink
// This configures which chains and wallets are supported

// ⚠️ FOR PRODUCTION: Get a free project ID from https://cloud.walletconnect.com
// The app works without it, but WalletConnect mobile won't work
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'StylusLink',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [arbitrumSepolia, arbitrum],
  ssr: true, // Enable server-side rendering support for Next.js
});

// Chain ID for Arbitrum Sepolia (used in contract interactions)
export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
