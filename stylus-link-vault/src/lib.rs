#![cfg_attr(not(feature = "export-abi"), no_std)]
extern crate alloc;

// --- IMPORTS ---
use stylus_sdk::{prelude::*, storage::*, crypto::keccak, call::transfer_eth, call::RawCall};
use alloy_sol_types::SolValue;
use stylus_sdk::alloy_primitives::{U256, U64, Address, address};
use alloc::vec::Vec;

// --- MEMORY ALLOCATOR ---
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;

// --- PANIC HANDLER ---
#[cfg(target_arch = "wasm32")]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

// --- CONSTANTS ---
// The Arbitrum P-256 Precompile Address (RIP-7212 / EIP-7951)
const P256_PRECOMPILE: Address = address!("0000000000000000000000000000000000000100");

// --- STORAGE ---
#[solidity_storage]
pub struct Drop {
    pub sender: StorageAddress,
    pub amount: StorageU256,
    pub active: StorageBool,
    pub expires_at: StorageU64,
    pub gatekeeper: StorageAddress,
    pub signer_pub_key_x: StorageBytes, 
    pub signer_pub_key_y: StorageBytes, 
}

#[solidity_storage]
#[entrypoint]
pub struct StylusLink {
    drops: StorageMap<U256, Drop>,
}

// --- CONTRACT IMPLEMENTATION ---
#[external]
impl StylusLink {
    
    // ✅ MOVED INSIDE: The 'drops' view function
    pub fn drops(&self, drop_id: U256) -> Result<(Address, U256, bool, u64, Address, Vec<u8>, Vec<u8>), Vec<u8>> {
        let drop = self.drops.get(drop_id);
        
        Ok((
            drop.sender.get(),
            drop.amount.get(),
            drop.active.get(),
            drop.expires_at.get().to(),
            drop.gatekeeper.get(),
            drop.signer_pub_key_x.get_bytes(),
            drop.signer_pub_key_y.get_bytes()
        ))
    }

    #[payable]
    pub fn create_drop(
        &mut self, 
        drop_id: U256, 
        pub_x: Vec<u8>, 
        pub_y: Vec<u8>,
        gatekeeper: Address,
        expires_at: u64
    ) -> Result<(), Vec<u8>> {
        if self.drops.get(drop_id).sender.get() != Address::ZERO {
            return Err(b"E1".to_vec()); // Drop Exists
        }

        let mut drop = self.drops.setter(drop_id);
        drop.sender.set(stylus_sdk::msg::sender());
        drop.amount.set(stylus_sdk::msg::value());
        drop.active.set(true);
        drop.expires_at.set(U64::from(expires_at));
        drop.gatekeeper.set(gatekeeper);
        drop.signer_pub_key_x.set_bytes(pub_x);
        drop.signer_pub_key_y.set_bytes(pub_y);

        Ok(())
    }

    pub fn claim_drop(
        &mut self, 
        drop_id: U256, 
        receiver: Address,
        agent_signature: Vec<u8>,      
        biometric_signature: Vec<u8>,  
        message_hash: Vec<u8>          
    ) -> Result<(), Vec<u8>> {
        
        // 1. Check Active Status
        if !self.drops.get(drop_id).active.get() {
            return Err(b"E2".to_vec()); // Inactive
        }

        // 2. Check Expiry
        let expires = self.drops.get(drop_id).expires_at.get();
        if U64::from(stylus_sdk::block::timestamp()) > expires {
            return Err(b"E3".to_vec()); // Expired
        }

        let mut is_authorized = false;
        let gatekeeper_addr = self.drops.get(drop_id).gatekeeper.get();

        // 3. PATH A: AGENT VERIFICATION (Short-Circuit)
        if gatekeeper_addr != Address::ZERO && !agent_signature.is_empty() {
            if agent_signature.len() != 65 { return Err(b"E4".to_vec()); }

            // Reconstruct Raw Hash: Keccak(DropID + Receiver)
            let eth_signed_message_hash = keccak(alloy_sol_types::sol! { 
                (drop_id, receiver) 
            }.abi_encode_packed());

            // Add Ethereum Prefix to match ethers.Wallet.signMessage
            let mut prefix_packed = Vec::with_capacity(60);
            prefix_packed.extend_from_slice(b"\x19Ethereum Signed Message:\n32");
            prefix_packed.extend_from_slice(eth_signed_message_hash.as_slice());
            let prefixed_hash = keccak(&prefix_packed);

            let r = &agent_signature[0..32];
            let s = &agent_signature[32..64];
            let v = agent_signature[64]; 

            // ecrecover call
            let mut input = Vec::with_capacity(128);
            input.extend_from_slice(prefixed_hash.as_slice()); 
            input.extend_from_slice(&[0u8; 31]); 
            input.push(v);
            input.extend_from_slice(r);
            input.extend_from_slice(s);

            let res = stylus_sdk::call::static_call(
                &mut *self, 
                address!("0000000000000000000000000000000000000001"), 
                &input
            ).map_err(|_| b"E5".to_vec())?;

            if res.len() == 32 { 
                let recovered = Address::from_slice(&res[12..32]);
                if recovered == gatekeeper_addr {
                    is_authorized = true; // ✅ AGENT VALIDATED
                }
            }
        }

        // 4. PATH B: BIOMETRIC CHECK (Only if Agent failed/missing)
        if !is_authorized {
            if biometric_signature.is_empty() {
                 return Err(b"E15: Bio Missing".to_vec());
            }

            let pub_x = self.drops.get(drop_id).signer_pub_key_x.get_bytes();
            let pub_y = self.drops.get(drop_id).signer_pub_key_y.get_bytes();
            
            if !verify_p256_precompile(&pub_x, &pub_y, &biometric_signature, &message_hash)? {
                return Err(b"E8".to_vec()); 
            }
            is_authorized = true;
        }

        // 5. Final Guard
        if !is_authorized {
            return Err(b"E7: Unauthorized".to_vec());
        }

        // 6. Transfer Funds
        let mut drop = self.drops.setter(drop_id); 
        let amount = drop.amount.get();
        drop.active.set(false); 

        transfer_eth(receiver, amount).map_err(|_| b"E9".to_vec())?;

        Ok(())
    }

    pub fn reclaim_drop(&mut self, drop_id: U256) -> Result<(), Vec<u8>> {
        let mut drop = self.drops.setter(drop_id);
        if stylus_sdk::msg::sender() != drop.sender.get() { return Err(b"E10".to_vec()); }
        if U64::from(stylus_sdk::block::timestamp()) <= drop.expires_at.get() { return Err(b"E11".to_vec()); }
        if !drop.active.get() { return Err(b"E12".to_vec()); }

        drop.active.set(false);
        transfer_eth(drop.sender.get(), drop.amount.get()).map_err(|_| b"E13".to_vec())?;
        Ok(())
    }
}

// --- HELPER: P-256 PRECOMPILE CALL ---
fn verify_p256_precompile(
    pub_x: &[u8],
    pub_y: &[u8],
    signature: &[u8], // Expected: R (32) | S (32)
    message_hash: &[u8]
) -> Result<bool, Vec<u8>> {
    
    // 1. Validate Input Lengths
    if pub_x.len() != 32 || pub_y.len() != 32 || message_hash.len() != 32 {
        return Err(b"E14".to_vec());
    }
    // WebAuthn/P256 sigs are often 64 bytes (R|S). If DER, we'd need to parse.
    // Assuming clean 64-byte input from frontend here for efficiency.
    if signature.len() != 64 {
        return Err(b"E15".to_vec()); 
    }

    let r = &signature[0..32];
    let s = &signature[32..64];

    // 2. Construct Payload [Hash(32) | R(32) | S(32) | X(32) | Y(32)] = 160 Bytes
    let mut input = Vec::with_capacity(160);
    input.extend_from_slice(message_hash);
    input.extend_from_slice(r);
    input.extend_from_slice(s);
    input.extend_from_slice(pub_x);
    input.extend_from_slice(pub_y);

    // 3. Call Precompile 0x100
    // We use all available gas. EIP-7951 costs 6,900 gas.
    let gas_limit = stylus_sdk::evm::gas_left();
    
    let res = RawCall::new_static()
        .gas(gas_limit)
        .call(P256_PRECOMPILE, &input)
        .map_err(|_| b"E16".to_vec())?; // Precompile Call Error

    // 4. Check Output
    // Success = 32 bytes representing 1. Failure = Empty or 0.
    if res.len() != 32 {
        return Ok(false);
    }

    // Check if the last byte is 1
    let is_valid = res[31] == 1;
    Ok(is_valid)
}