
import { base, mainnet, Chain } from 'viem/chains';
import type { EntryPoint } from "permissionless/types/entrypoint";

// --- CONFIGURATION ---
// IMPORTANT: The API key is sourced from environment variables.
// In a real-world scenario, this would be configured in your deployment environment.
export const PIMLICO_API_KEY = process.env.API_KEY;

// The chosen chain for deployment. Base is recommended for lower gas fees.
export const CHAIN: Chain = base;

// The entrypoint for the smart account operations. Version 0.7 is used here.
export const ENTRYPOINT_V07: EntryPoint = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";

// The address of the pre-deployed Social Recovery Module contract.
export const RECOVERY_MODULE_ADDR: `0x${string}` = "0x636632FA22052d2a4Fb6e3Bab84551B620b9C1F9";
