
import { privateKeyToAccount } from 'viem/accounts';
import type { PrivateKeyAccount } from 'viem/accounts';

/**
 * Simulates acquiring a biometric owner (e.g., from a passkey).
 * In a real application, this would interact with the WebAuthn API or a service like Turnkey.
 * For this demo, we generate a new, random local account to act as the owner.
 * @returns A promise that resolves to a `PrivateKeyAccount`.
 */
export const getBiometricOwner = async (): Promise<PrivateKeyAccount> => {
  console.log("Simulating biometric prompt for owner key...");

  // Simulate a delay for user interaction (e.g., fingerprint scan)
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Generate a random private key for demonstration purposes.
  // In a real passkey implementation, the key material is never exposed to the app.
  const privateKey = ('0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')) as `0x${string}`;
  
  const account = privateKeyToAccount(privateKey);
  
  console.log("Biometric owner created (mock):", account.address);
  return account;
};
