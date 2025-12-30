#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]

#[cfg(not(any(test, feature = "export-abi")))]
#[no_mangle]
pub extern "C" fn main() {}

#[cfg(feature = "export-abi")]
fn main() {
    // This connects to the #[entrypoint] in lib.rs to print the Solidity ABI
    stylus_link_vault::print_abi("MIT", "pragma solidity ^0.8.23;");
}