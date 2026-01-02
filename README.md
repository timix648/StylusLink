# StylusLink Protocol

<p align="center">
  <img src="frontend/public/op1.jpg" alt="StylusLink Logo" width="120" height="120" style="border-radius: 16px;" />
</p>

<p align="center">
  <strong>AI-Gated Biometric Payments on Arbitrum Stylus</strong>
</p>

<p align="center">
  Trustless • Biometric • Intelligent
</p>

---

## Executive Overview

**StylusLink** is a next-generation payment protocol that transforms simple URL links into programmable, AI-gated "Smart Drops." Unlike traditional crypto payments that require complex wallet setups and seed phrase management, StylusLink enables users to claim digital assets using nothing but **FaceID or TouchID**—verified trustlessly on-chain.

### The Problem We Solve

The digital asset landscape suffers from a critical UX divide:
- **Web2 fintech** (Venmo, PayPal): Seamless, identity-driven interactions
- **Web3 payments**: Cumbersome, address-driven, intimidating hex strings

Current "Link Drop" solutions (like Peanut Protocol or TipLink) improve accessibility but have fundamental weaknesses:
1. **Security Risk**: If a URL is intercepted, funds are stolen (bearer instruments)
2. **No Logic**: Cannot verify if recipients deserve/qualify for the funds

### The StylusLink Solution

StylusLink introduces a **dual-factor security model**:
- **Possession Factor**: Having the link proves intent
- **Biometric Factor**: Hardware-secured signature proves identity

Combined with an **AI Gatekeeper**, drops become intelligent:
- Verify on-chain history (wallet age, transaction count, NFT holdings)
- Check community membership (Discord roles, tenure)
- Enforce custom rules via natural language ("Must be a DeFi power user")

---

## Architecture

StylusLink follows a **Three-Pillar Topology** designed for trust minimization:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STYLUSLINK ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────────┐      ┌──────────────┐      ┌──────────────────────┐    │
│    │   COURIER    │      │  GATEKEEPER  │      │        VAULT         │    │
│    │  (Frontend)  │◄────►│   (Server)   │◄────►│  (Stylus Contract)   │    │
│    └──────────────┘      └──────────────┘      └──────────────────────┘    │
│           │                     │                        │                  │
│    • Next.js App          • Node.js/Express       • Rust/WASM              │
│    • WebAuthn/Passkeys    • Gemini AI Agent       • P-256 Precompile       │
│    • Wallet Connect       • Verification APIs     • Fund Custody           │
│    • Biometric Capture    • ECDSA Signing         • Dual Verification      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Details

#### 1. The Courier (Frontend)
**Location**: `frontend/`

The user-facing interface built with Next.js 16, responsible for:
- Creating and sharing Smart Drops (Quest links)
- Capturing biometric assertions via WebAuthn
- Wallet connection (RainbowKit + wagmi)
- QR code generation for cross-device authentication

**Key Technologies**:
- Next.js 16 + React 19
- TailwindCSS + Framer Motion
- wagmi + viem for Web3 interactions
- WebAuthn API for biometric signatures

#### 2. The Gatekeeper (Backend)
**Location**: `gatekeeper-api/`

An intelligent Node.js server that acts as both Oracle and Relayer:
- **AI Verification**: Gemini 2.0/2.5 Flash for natural language rule interpretation
- **On-Chain Checks**: Wallet age, transaction history, gas spent, NFT holdings
- **Social Verification**: Discord role/tenure verification
- **Sybil Resistance**: Multi-factor humanity scoring
- **Relayer**: Gasless claims via meta-transactions

**Verification Categories**:
| Category | Description | Data Source |
|----------|-------------|-------------|
| Financial | Wallet age, TX count, gas spent | Etherscan API |
| NFT | Ownership, original minter check | Alchemy API |
| Discord | Role membership, join date | Discord API |
| AI Logic | Natural language rule synthesis | Gemini AI |
| Social | Twitter/GitHub verification | OAuth + Mock |
| Sybil | Humanity scoring, geo-location | Gitcoin Passport |

#### 3. The Vault (Smart Contract)
**Location**: `stylus-link-vault/`

A Rust-based smart contract deployed on Arbitrum Stylus that:
- Holds custody of funds in escrow
- Verifies **Agent signatures** (ECDSA secp256k1 via ecrecover)
- Verifies **Biometric signatures** (P-256 via 0x100 precompile)
- Enforces dual-verification before releasing funds

**Why Stylus?**

The protocol leverages Arbitrum Stylus for a critical reason: **P-256 signature verification**.

| Approach | Gas Cost | Notes |
|----------|----------|-------|
| Solidity (EVM) | 300,000 - 1,000,000 | Prohibitively expensive |
| Rust Library (WASM) | 20,000 - 50,000 | Still heavy |
| **Precompile 0x100** | **~6,900** | Native, optimized |

The `RIP-7212/EIP-7951` precompile at address `0x100` (activated in ArbOS 51) enables hardware-grade biometric verification at ~80% lower cost than alternatives.

---

## Security Model

StylusLink implements a **Multi-Signature Paradigm** between AI and Human:

```
                    ┌─────────────────────────────┐
                    │      CLAIM AUTHORIZATION     │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
           ┌───────────────┐           ┌───────────────┐
           │    AGENT      │           │   BIOMETRIC   │
           │  SIGNATURE    │           │   SIGNATURE   │
           │  (secp256k1)  │           │    (P-256)    │
           └───────────────┘           └───────────────┘
                    │                           │
                    │                           │
           "Off-chain rules             "Physical presence
            were satisfied"              was verified"
                    │                           │
                    └─────────────┬─────────────┘
                                  ▼
                    ┌─────────────────────────────┐
                    │       FUNDS RELEASED        │
                    └─────────────────────────────┘
```

**Key Security Properties**:
1. **No Single Point of Failure**: Even if the Gatekeeper server is compromised, attackers cannot drain funds without valid biometric signatures from registered users
2. **Hardware-Backed**: P-256 signatures originate from device Secure Enclaves (Apple/Android), not software keys
3. **Non-Replayable**: Signatures are bound to specific drop IDs and receiver addresses
4. **Time-Bounded**: Drops expire, allowing sender reclaim after timeout

---

## Project Structure

```
StylusLink/
├── frontend/                    # Next.js 16 Frontend (Courier)
│   ├── app/                     # App Router pages
│   │   ├── page.tsx            # Home page with quest creation
│   │   ├── about/page.tsx      # Protocol documentation
│   │   └── layout.tsx          # Root layout with providers
│   ├── components/              # React components
│   │   ├── CreateDrop.tsx      # Quest creation wizard
│   │   ├── MyQuests.tsx        # User's created quests
│   │   ├── QuestCard.tsx       # Quest display component
│   │   ├── QuestDrawer.tsx     # Quest claim interface
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── WalletContext.tsx   # Wallet state management
│   │   └── tools/
│   │       └── BiometricPad.tsx # WebAuthn interface
│   ├── lib/                     # Utilities
│   │   ├── wagmi.ts            # wagmi configuration
│   │   └── ethersAdapter.ts    # Ethers.js adapter
│   └── public/                  # Static assets
│       └── op1.jpg             # Project logo
│
├── gatekeeper-api/              # Node.js Backend (Gatekeeper)
│   ├── server.js               # Express server with AI logic
│   ├── package.json            # Dependencies
│   └── .env                    # Environment variables (create this)
│
├── stylus-link-vault/           # Rust Smart Contract (Vault)
│   ├── src/
│   │   ├── lib.rs              # Contract implementation
│   │   └── main.rs             # ABI export helper
│   ├── Cargo.toml              # Rust dependencies
│   └── rust-toolchain.toml     # Rust version pinning
│
└── README.md                    # This file
```

---

## Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Rust** (with `wasm32-unknown-unknown` target)
- **Cargo Stylus** CLI
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/StylusLink.git
cd StylusLink
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_GATEKEEPER_URL=http://localhost:4000
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...your_deployed_contract
```

Start the development server:
```bash
npm run dev
```
Frontend runs at: `http://localhost:3001`

### 3. Gatekeeper API Setup

```bash
cd gatekeeper-api
npm install
```

Create `.env`:
```env
# Server
PORT=4000

# AI
GEMINI_API_KEY=your_gemini_api_key

# Blockchain
RPC_SEPOLIA_ARBITRUM=https://sepolia-rollup.arbitrum.io/rpc
PRIVATE_KEY=your_relayer_private_key
STYLUS_CONTRACT_ADDRESS=0x...deployed_contract_address

# Verification APIs
ETHERSCAN_API_KEY=your_etherscan_key
DISCORD_BOT_TOKEN=your_discord_bot_token
```

Start the server:
```bash
node server.js
```
API runs at: `http://localhost:4000`

### 4. Smart Contract Deployment (Optional)

```bash
cd stylus-link-vault

# Install Stylus CLI if not present
cargo install cargo-stylus

# Check contract compiles
cargo stylus check

# Deploy to Arbitrum Sepolia
cargo stylus deploy --private-key $PRIVATE_KEY
```

---

## Usage Flow

### Creating a Smart Drop (Quest)

1. **Connect Wallet**: Click "Connect" and approve with MetaMask/WalletConnect
2. **Create Quest**: Click "Create Quest" and configure:
   - **Amount**: ETH to lock in the drop
   - **Gate Type**: Knowledge, On-Chain, Identity, Discord, etc.
   - **Rules**: Natural language conditions (e.g., "Must have 50+ transactions")
   - **Expiry**: When sender can reclaim unclaimed funds
3. **Share Link**: Copy the generated URL and share with recipients

### Claiming a Drop

1. **Open Link**: Recipient opens the quest URL
2. **Verification**: Gatekeeper checks eligibility:
   - On-chain history analysis
   - Discord role verification
   - AI rule interpretation
3. **Biometric Auth**: User authenticates with FaceID/TouchID
4. **Claim**: Funds transfer to recipient's wallet (gasless!)

---

## API Endpoints

### Gatekeeper API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server health check |
| `/api/verify` | POST | Run AI verification checks |
| `/api/claim` | POST | Process claim with signatures |
| `/api/drops/:id` | GET | Get drop status |

### Verification Request

```json
POST /api/verify
{
  "dropId": "123",
  "receiverAddress": "0x...",
  "gateType": "KNOWLEDGE",
  "userAnswer": "Paris",
  "discordUserId": "123456789"
}
```

### Claim Request

```json
POST /api/claim
{
  "dropId": "123",
  "receiver": "0x...",
  "biometricSignature": "0x...",
  "messageHash": "0x...",
  "authenticatorData": "0x..."
}
```

---

## Testing

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

### Gatekeeper
```bash
cd gatekeeper-api
node test_full_flow.js
```

### Smart Contract
```bash
cd stylus-link-vault
cargo test --features mock_verifier
cargo stylus check
```

---

## Deployment

### Frontend (Vercel)
```bash
cd frontend
vercel --prod
```

### Gatekeeper (Railway/Render)
Deploy `gatekeeper-api/` with environment variables configured.

### Smart Contract (Arbitrum Sepolia)
```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS, Framer Motion |
| Web3 | wagmi, viem, RainbowKit, ethers.js |
| Backend | Node.js, Express, Gemini AI |
| Smart Contract | Rust, Stylus SDK 0.5.1, WASM |
| Blockchain | Arbitrum Sepolia (Stylus-enabled) |
| Auth | WebAuthn, P-256/secp256r1 |

---

## Key Concepts

### The Hardware-Chain Gap
Mobile secure enclaves (Apple Secure Enclave, Android Keystore) use **P-256** for signatures, while Ethereum uses **secp256k1**. StylusLink bridges this gap using the `0x100` precompile.

### WebAuthn Flow
```
User clicks "Claim" 
    → Browser calls navigator.credentials.get()
    → Device prompts FaceID/TouchID
    → Secure Enclave signs challenge with P-256
    → Signature sent to contract
    → Precompile 0x100 verifies on-chain
```

### AI Gatekeeper Role
The AI doesn't decide subjectively—it **interprets deterministic tool outputs**:
- Tool returns: `{ wallet_age_days: 400, tx_count: 150 }`
- Rule: "Must be a crypto veteran"
- AI synthesizes: `wallet_age > 365 AND tx_count > 50` → **APPROVED**

---

## Hackathon Alignment

**Arbitrum APAC Mini-Hackathon - Stylus Playground Track**

| Criteria | How StylusLink Delivers |
|----------|------------------------|
| **Technical Completeness** | Full-stack: Rust contract + Node.js API + Next.js frontend |
| **Creativity** | First AI-gated biometric payment protocol on Stylus |
| **Wow Factor** | Claim crypto with Biometrics, no seed phrase |
| **Stylus Utilization** | P-256 precompile enables economically viable biometrics |


## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## Contact

- **Project**: StylusLink Protocol
- **Built By**: 0xGenZero (X/Twitter)

---

<p align="center">
  <strong>Bridging the Hardware-Chain Gap, One Biometric at a Time</strong>
</p>