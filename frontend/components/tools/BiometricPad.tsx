'use client';

import { useState } from 'react';
import { ethers } from 'ethers';

interface BiometricPadProps {
  dropId: string;
  challenge: string;
  receiverAddress: string;
  onSuccess: () => void;
}

// --- HELPER: Decode DER Signature (Fixes E15 Data Length) ---
function decodeDERSignature(signature: Uint8Array): { r: Uint8Array; s: Uint8Array } {
  let offset = 2;
  const rLen = signature[offset + 1];
  let r = signature.slice(offset + 2, offset + 2 + rLen);
  if (r.length === 33 && r[0] === 0x00) r = r.slice(1);

  offset += 2 + rLen;
  const sLen = signature[offset + 1];
  let s = signature.slice(offset + 2, offset + 2 + sLen);
  if (s.length === 33 && s[0] === 0x00) s = s.slice(1);

  const r32 = new Uint8Array(32);
  r32.set(r, 32 - r.length);
  const s32 = new Uint8Array(32);
  s32.set(s, 32 - s.length);

  return { r: r32, s: s32 };
}

export const BiometricPad = ({ dropId, challenge, receiverAddress, onSuccess }: BiometricPadProps) => {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'registering' | 'verifying' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Core Signing Logic
  const performSigning = async (challengeBuffer: Uint8Array, allowList: PublicKeyCredentialDescriptor[] = []): Promise<any> => {
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer as any,
        rpId: window.location.hostname,
        userVerification: "required",
        allowCredentials: allowList,
      },
    }) as PublicKeyCredential;
    if (!credential) throw new Error("Credential access denied");
    return credential;
  };

  // 2. Core Registration Logic
  const performRegistration = async (challengeBuffer: Uint8Array) => {
    setStatus('registering');
    return await navigator.credentials.create({
      publicKey: {
        // TypeScript bypass
        challenge: challengeBuffer as any,
        rp: { name: "StylusLink Proof", id: window.location.hostname },
        user: {
          id: Uint8Array.from(crypto.randomUUID(), c => c.charCodeAt(0)),
          name: "human@styluslink.com",
          displayName: "Verified Human",
        },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false
        },
        timeout: 60000,
      },
    }) as PublicKeyCredential;
  };

  const handleScan = async () => {
    if (!receiverAddress || !ethers.isAddress(receiverAddress)) {
      setErrorMsg("Invalid Receiver Address");
      setStatus('error');
      return;
    }

    setStatus('scanning');
    setErrorMsg('');

    try {
      // 🚨 KEY FIX: WebAuthn requires the challenge to be base64url encoded often, 
      // but here we stick to Buffer as per your setup.
      const challengeBuffer = Uint8Array.from(challenge, c => c.charCodeAt(0));
      let credential;

      try {
        credential = await performSigning(challengeBuffer);
      } catch (e: any) {
        if (e.name === 'NotAllowedError') {
          console.log("Creating new key...");
          const newCred = await performRegistration(challengeBuffer);
          const allowList: PublicKeyCredentialDescriptor[] = [{ type: 'public-key', id: newCred.rawId }];
          setStatus('scanning');
          credential = await performSigning(challengeBuffer, allowList);
        } else {
          throw e;
        }
      }

      setStatus('verifying');

      const response = credential.response as AuthenticatorAssertionResponse;
      const signatureRaw = new Uint8Array(response.signature);
      const { r, s } = decodeDERSignature(signatureRaw);

      // Combine to 64 bytes
      const compactSignature = new Uint8Array(64);
      compactSignature.set(r, 0);
      compactSignature.set(s, 32);

      // 🚨 CRITICAL: The "message" being signed is NOT just the challenge.
      // It is authenticatorData + sha256(clientDataJSON).
      // We must send these raw components so the contract can verify exactly what was signed.

      const payload = {
        dropId,
        receiver: receiverAddress,
        biometricData: {
          id: credential.id,
          signature: Array.from(compactSignature),

          // Send these so the backend/contract can reconstruct the message
          authenticatorData: Array.from(new Uint8Array(response.authenticatorData)),
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          challenge: challenge // Send original challenge string for verification
        }
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_GATEKEEPER_URL}/api/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim Failed");

      onSuccess();

    } catch (e: any) {
      console.error(e);
      setStatus('error');
      if (e.name === 'NotAllowedError') setErrorMsg("Scan cancelled.");
      else setErrorMsg(e.message || "Verification failed");
    } finally {
      if (status !== 'error') setStatus('idle');
    }
  };

  return (
    <div className="w-full">
      {status === 'error' && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <button
        onClick={handleScan}
        disabled={status !== 'idle' && status !== 'error'}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${status !== 'idle' && status !== 'error'
            ? 'bg-zinc-700 text-zinc-400 cursor-wait'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-[1.02] text-white'
          }`}
      >
        {status === 'registering' ? (
          <><span>👆 First Scan: Setup Secure ID...</span></>
        ) : status === 'scanning' ? (
          <><span>✌️ Second Scan: Confirm Claim</span></>
        ) : status === 'verifying' ? (
          <>Verifying Proof...</>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
            Scan to Claim
          </>
        )}
      </button>
    </div>
  );
};