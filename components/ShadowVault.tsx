import React, { useState } from 'react';
import { http, createPublicClient, encodeFunctionData, parseAbi, parseAbiParameters, encodeAbiParameters } from 'viem';
import { createSmartAccountClient } from 'permissionless';
import { toSafeSmartAccount } from 'permissionless/accounts';
import { createPimlicoClient } from 'permissionless/clients/pimlico';
import type { SmartAccountClient } from "permissionless";
import type { Chain } from 'viem';

import { Shield, Loader2, Fingerprint, Lock, CheckCircle, Users, AlertTriangle } from './icons';
import { PIMLICO_API_KEY, CHAIN, ENTRYPOINT_V07, RECOVERY_MODULE_ADDR } from '../constants';
import { getBiometricOwner } from '../utils/wallet';

// FIX: Correctly type the SmartAccountClient. Based on the error, the generic parameter
// for the account was being incorrectly passed the Chain type. Using `any` for the account
// type makes it more flexible and resolves the type error.
type SmartClient = SmartAccountClient<typeof ENTRYPOINT_V07, any, any, Chain>

const ShadowVault: React.FC = () => {
  const [smartClient, setSmartClient] = useState<SmartClient | null>(null);
  const [status, setStatus] = useState('Idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!PIMLICO_API_KEY) {
    return (
      <div className="max-w-md mx-auto p-8 bg-slate-900 border border-red-500/50 rounded-2xl shadow-lg text-white text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-4" size={40}/>
        <h2 className="text-lg font-bold mb-2">Configuration Error</h2>
        <p className="text-sm text-slate-400">
          Pimlico API key is missing. Please set the `API_KEY` environment variable to continue.
        </p>
      </div>
    );
  }
  
  const rpcUrl = `https://api.pimlico.io/v2/${CHAIN.id}/rpc?apikey=${PIMLICO_API_KEY}`;

  const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
  const pimlicoClient = createPimlicoClient({ transport: http(rpcUrl) });

  const createVault = async () => {
    setLoading(true);
    setError(null);
    setStatus('Initializing Biometric Vault...');
    try {
      // In production, 'owner' comes from Turnkey, Privy, or another Passkey Signer.
      // Here, we simulate it with a locally generated key.
      const owner = await getBiometricOwner(); 

      // FIX: The `toSafeSmartAccount` function now expects a single object argument.
      const safeAccount = await toSafeSmartAccount({
        publicClient,
        owner,
        entryPoint: ENTRYPOINT_V07,
        safeVersion: "1.4.1",
        saltNonce: 0n, // Use 0n for deterministic address, or a random bigint for a new address
      });

      // FIX: The `middleware` property is deprecated. `sponsorUserOperation` is now a top-level property,
      // and `gasPrice` is typically handled by the bundler.
      const client = createSmartAccountClient({
        account: safeAccount,
        chain: CHAIN,
        bundlerTransport: http(rpcUrl),
        sponsorUserOperation: pimlicoClient.sponsorUserOperation,
      });

      setSmartClient(client);
      setStatus(`Vault Active: ${client.account.address.slice(0, 6)}...${client.account.address.slice(-4)}`);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || 'An unknown error occurred.';
      setStatus('Initialization Failed');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const enableRecovery = async (guardians: `0x${string}`[]) => {
    if (!smartClient) return;
    setLoading(true);
    setError(null);
    setStatus('Configuring 3-of-5 Guardian Protocol...');
    try {
      const setupData = encodeAbiParameters(
        parseAbiParameters('address[] guardians, uint256 threshold, uint256 delay'),
        [guardians, 3n, 48n * 3600n] // 3-of-5 guardians, 48hr delay
      );

      const moduleSetupData = encodeFunctionData({
        abi: parseAbi(['function enableModule(address module)']),
        functionName: 'enableModule',
        args: [RECOVERY_MODULE_ADDR]
      });

      // FIX: `sendTransactions` expects an array of transactions directly for batching,
      // not an object with a `transactions` property.
      const txHash = await smartClient.sendTransactions([
            {
              to: smartClient.account.address,
              data: moduleSetupData
            },
            {
                to: RECOVERY_MODULE_ADDR,
                data: encodeFunctionData({
                    abi: parseAbi(['function setup(bytes calldata data)']),
                    functionName: 'setup',
                    args: [setupData]
                })
            }
        ]
      );
      
      setStatus(`Recovery Protocol Live: ${txHash.slice(0, 10)}...`);
    } catch (err: any) {
      console.error(err);
      setStatus('Recovery Setup Failed');
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const GuardianButton = () => (
    <button 
      onClick={() => enableRecovery([
          "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", 
          "0x1234567890123456789012345678901234567890", 
          "0xfedcba9876543210fedcba9876543210fedcba98",
          "0xabcdef1234567890abcdef1234567890abcdef",
          "0x0987654321fedcba0987654321fedcba098765"
      ])} 
      disabled={loading}
      className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-2xl flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 className="animate-spin mr-2" /> : <Users className="mr-2" size={20} />}
      SETUP 3-OF-5 GUARDIANS
    </button>
  );

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl shadow-cyan-500/10 text-white font-mono">
      <div className="flex justify-between items-center mb-8">
        <Shield className="text-emerald-400" size={28} />
        <h1 className="font-bold tracking-tighter text-xl bg-gradient-to-r from-white to-slate-400 text-transparent bg-clip-text">SHADOWVAULT</h1>
        <Lock className="text-slate-600" size={18} />
      </div>

      {!smartClient ? (
        <button onClick={createVault} disabled={loading} className="w-full py-5 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-2xl flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
          {loading ? <Loader2 className="animate-spin mr-2" /> : <Fingerprint className="mr-2" />}
          CREATE SECURE VAULT
        </button>
      ) : (
        <div className="space-y-6 text-center">
          <CheckCircle className="text-emerald-400 mx-auto" size={48} />
          <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
            <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Vault Address</p>
            <code className="text-xs text-cyan-300 break-all">{smartClient.account.address}</code>
          </div>
          <GuardianButton />
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-slate-800 text-center min-h-[40px] flex flex-col justify-center">
        <p className="text-[11px] text-slate-500 uppercase tracking-wider">
          {status}
        </p>
        {error && <p className="text-xs text-red-400/80 mt-2 break-words">{error}</p>}
      </div>
    </div>
  );
};

export default ShadowVault;
