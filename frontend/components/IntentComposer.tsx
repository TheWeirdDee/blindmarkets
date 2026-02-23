'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { useIntentStore } from '../state/useIntentStore';
import { buildIntent, encryptIntentForGateway, generateNonce } from '../lib/intentCrypto';

const privacyOptions = [
  { id: 'public', label: 'Public', icon: '🔓', color: 'text-text-muted' },
  { id: 'hidden-amount', label: 'Hidden Amount', icon: '🔒', color: 'text-accent-warning' },
  { id: 'hidden-direction', label: 'Hidden Direction', icon: '🔐', color: 'text-accent-success' }
] as const;

export default function IntentComposer() {
  const { draft, setDraft, walletAddress } = useIntentStore();
  const [minOutput, setMinOutput] = useState(Number(draft.minOutput) || 0);
  const [maxFee, setMaxFee] = useState(draft.maxFeeBps ? draft.maxFeeBps / 100 : 0);
  const [privacy, setPrivacy] = useState(draft.privacyMode);
  const [userAddress, setUserAddress] = useState(walletAddress);
  const [signatureR, setSignatureR] = useState('');
  const [signatureS, setSignatureS] = useState('');
  const [intentHash, setIntentHash] = useState('');
  const [intentId, setIntentId] = useState('');
  const [preparedNonce, setPreparedNonce] = useState('');
  const [statusIntentId, setStatusIntentId] = useState('');
  const [statusResult, setStatusResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (walletAddress && walletAddress !== userAddress) {
      setUserAddress(walletAddress);
    }
  }, [walletAddress, userAddress]);

  useEffect(() => {
    setPreparedNonce('');
    setIntentHash('');
    setIntentId('');
  }, [draft.assetIn, draft.assetOut, draft.amount, draft.minOutput, draft.deadlineMinutes, privacy, userAddress]);

  const prepareIntent = () => {
    setStatusMessage(null);
    if (!userAddress || !draft.assetIn || !draft.assetOut || !draft.amount || !draft.minOutput || !draft.deadlineMinutes) {
      setStatusMessage('Complete all intent fields before preparing.');
      return;
    }
    if (!isHex(userAddress) || !isHex(draft.assetIn) || !isHex(draft.assetOut)) {
      setStatusMessage('Addresses must be hex values starting with 0x.');
      return;
    }
    try {
      const amount = parseBigint(draft.amount);
      const minOut = parseBigint(draft.minOutput);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + draft.deadlineMinutes * 60);
      const nonce = generateNonce();
      const intent = buildIntent({
        userAddress,
        assetIn: draft.assetIn,
        assetOut: draft.assetOut,
        amount,
        minOutput: minOut,
        maxFeeBps: draft.maxFeeBps,
        deadline,
        privacyMode: privacy,
        nonce
      });
      setPreparedNonce(nonce);
      setIntentHash(intent.intentHash);
      setIntentId(intent.intentId);
      setStatusMessage('Intent hash prepared. Sign and submit.');
    } catch (error) {
      setStatusMessage(`Preparation failed: ${String(error)}`);
    }
  };

  const onSubmit = async () => {
    setStatusMessage(null);
    if (!userAddress || !signatureR || !signatureS) {
      setStatusMessage('User address and signature are required.');
      return;
    }
    if (!draft.assetIn || !draft.assetOut || !draft.amount || !draft.minOutput || !draft.deadlineMinutes) {
      setStatusMessage('Complete all intent fields before submitting.');
      return;
    }
    if (!isHex(userAddress) || !isHex(draft.assetIn) || !isHex(draft.assetOut)) {
      setStatusMessage('Addresses must be hex values starting with 0x.');
      return;
    }
    if (!isHex(signatureR) || !isHex(signatureS)) {
      setStatusMessage('Signature values must be hex.');
      return;
    }
    if (!preparedNonce) {
      setStatusMessage('Prepare intent to generate hash before submitting.');
      return;
    }

    const amount = parseBigint(draft.amount);
    const minOut = parseBigint(draft.minOutput);
    const deadline = BigInt(Math.floor(Date.now() / 1000) + draft.deadlineMinutes * 60);

    try {
      setIsSubmitting(true);
      const intent = buildIntent({
        userAddress,
        assetIn: draft.assetIn,
        assetOut: draft.assetOut,
        amount,
        minOutput: minOut,
        maxFeeBps: draft.maxFeeBps,
        deadline,
        privacyMode: privacy,
        nonce: preparedNonce
      });
      setIntentHash(intent.intentHash);
      setIntentId(intent.intentId);

      const gatewayPublicKeyResponse = await fetch('/api/gateway/public-key');
      if (!gatewayPublicKeyResponse.ok) {
        setStatusMessage('Failed to fetch gateway public key.');
        return;
      }
      const gatewayPublicKey = (await gatewayPublicKeyResponse.json()).gateway_public_key as string;

      const encrypted = await encryptIntentForGateway(intent, gatewayPublicKey);

      const response = await fetch('/api/gateway/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_id: intent.intentId,
          user_address: intent.userAddress,
          ciphertext: encrypted.ciphertextHex,
          encrypted_session_key: encrypted.encryptedSessionKeyHex,
          commitment: intent.intentHash,
          user_signature: [signatureR, signatureS],
          client_public_key: encrypted.clientPublicKeyHex,
          nonce: intent.nonce
        })
      });

      if (!response.ok) {
        const error = await response.text();
        setStatusMessage(`Submission failed: ${error}`);
        return;
      }
      setStatusMessage('Intent submitted successfully.');
      setStatusIntentId(intent.intentId);
    } catch (error) {
      setStatusMessage(`Submission failed: ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkStatus = async () => {
    setStatusResult(null);
    if (!statusIntentId || !isHex(statusIntentId)) {
      setStatusResult('Provide a valid intent ID.');
      return;
    }
    try {
      setIsCheckingStatus(true);
      const response = await fetch(`/api/gateway/intents/${statusIntentId}`);
      if (!response.ok) {
        const body = await response.text();
        setStatusResult(`Status query failed: ${body}`);
        return;
      }
      const payload = await response.json();
      setStatusResult(`Status: ${payload.status || 'unknown'} · Batch: ${payload.batch_id ?? '—'}`);
    } catch (error) {
      setStatusResult(`Status query failed: ${String(error)}`);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const cancelIntent = async () => {
    setStatusResult(null);
    if (!statusIntentId || !isHex(statusIntentId)) {
      setStatusResult('Provide a valid intent ID.');
      return;
    }
    if (!userAddress || !signatureR || !signatureS) {
      setStatusResult('User address and signature are required to cancel.');
      return;
    }
    try {
      setIsCanceling(true);
      const response = await fetch(`/api/gateway/intents/${statusIntentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: userAddress,
          signature: [signatureR, signatureS]
        })
      });
      if (!response.ok) {
        const body = await response.text();
        setStatusResult(`Cancel failed: ${body}`);
        return;
      }
      setStatusResult('Intent canceled.');
    } catch (error) {
      setStatusResult(`Cancel failed: ${String(error)}`);
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card glass-card-hover gradient-border relative overflow-hidden"
    >
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-text-muted">Intent Composer</p>
            <h2 className="text-2xl md:text-3xl font-semibold">Execute with Privacy</h2>
          </div>
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">
            Privacy 🔒
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">From</p>
              <div className="mt-2 flex items-center justify-between">
                <input
                  value={draft.assetIn}
                  onChange={(event) => setDraft({ assetIn: event.target.value })}
                  placeholder="0x..."
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ assetIn: draft.assetOut, assetOut: draft.assetIn })}
                  className="text-xs text-text-secondary"
                >
                  Switch
                </button>
              </div>
            </div>
            <div className="text-2xl text-text-muted">→</div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">To</p>
              <div className="mt-2 flex items-center justify-between">
                <input
                  value={draft.assetOut}
                  onChange={(event) => setDraft({ assetOut: event.target.value })}
                  placeholder="0x..."
                  className="w-full bg-transparent text-sm font-semibold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setDraft({ assetIn: draft.assetOut, assetOut: draft.assetIn })}
                  className="text-xs text-text-secondary"
                >
                  Switch
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">Amount (base units)</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <input
                  type="text"
                  value={draft.amount}
                  onChange={(event) => setDraft({ amount: event.target.value })}
                  className="w-full bg-transparent text-2xl font-semibold outline-none"
                  placeholder="0"
                />
                <span className="text-xs text-text-secondary">{draft.assetIn || '—'}</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">Balance: —</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">Deadline</p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={draft.deadlineMinutes}
                  onChange={(event) => setDraft({ deadlineMinutes: Number(event.target.value) })}
                  className="w-full bg-transparent text-2xl font-semibold outline-none"
                  placeholder="0"
                />
                <span className="text-xs text-text-secondary">minutes</span>
              </div>
              <p className="mt-1 text-xs text-text-muted">Batch window aligned</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-text-muted">User Address</span>
              <input
                value={userAddress}
                onChange={(event) => setUserAddress(event.target.value)}
                placeholder="0x..."
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">Signature</p>
              <div className="mt-2 grid gap-2">
                <input
                  value={signatureR}
                  onChange={(event) => setSignatureR(event.target.value)}
                  placeholder="r (0x...)"
                  className="w-full bg-transparent text-xs outline-none"
                />
                <input
                  value={signatureS}
                  onChange={(event) => setSignatureS(event.target.value)}
                  placeholder="s (0x...)"
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {(intentHash || intentId) && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-text-muted">Intent Hash</p>
                <p className="mt-2 break-all text-xs text-text-secondary">{intentHash || '—'}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs text-text-muted">Intent ID</p>
                <p className="mt-2 break-all text-xs text-text-secondary">{intentId || '—'}</p>
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="bg-white/5 border border-white/10 rounded-xl p-4">
              <span className="text-xs text-text-muted">Intent ID (status/cancel)</span>
              <input
                value={statusIntentId}
                onChange={(event) => setStatusIntentId(event.target.value)}
                placeholder="0x..."
                className="mt-2 w-full bg-transparent text-sm outline-none"
              />
            </label>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-text-muted">Status Actions</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={checkStatus}
                  disabled={isCheckingStatus}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                >
                  {isCheckingStatus ? 'Checking…' : 'Check Status'}
                </button>
                <button
                  onClick={cancelIntent}
                  disabled={isCanceling}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-text-secondary disabled:opacity-50"
                >
                  {isCanceling ? 'Canceling…' : 'Cancel Intent'}
                </button>
              </div>
              {statusResult && (
                <p className="mt-2 text-xs text-text-muted">{statusResult}</p>
              )}
            </div>
          </div>

          <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">Constraints</p>
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="text-xs text-text-muted"
              >
                {showAdvanced ? 'Advanced ▴' : 'Advanced ▾'}
              </button>
            </div>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Min Output</span>
                    <span className="text-text-secondary">{minOutput.toLocaleString()} {draft.assetOut || ''}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={minOutput > 0 ? Math.max(minOutput * 1.2, minOutput + 1) : 100}
                    value={minOutput}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setMinOutput(value);
                      setDraft({ minOutput: value.toString() });
                    }}
                    className="mt-2 w-full"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>Max Fee</span>
                    <span className="text-text-secondary">{maxFee.toFixed(2)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={maxFee}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setMaxFee(value);
                      setDraft({ maxFeeBps: Math.round(value * 100) });
                    }}
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-text-secondary">Privacy Mode</p>
            <div className="grid gap-2 md:grid-cols-3">
              {privacyOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPrivacy(option.id);
                    setDraft({ privacyMode: option.id as typeof draft.privacyMode });
                  }}
                  className={clsx(
                    'rounded-xl border px-3 py-3 text-left transition',
                    privacy === option.id
                      ? 'border-white/30 bg-white/10'
                      : 'border-white/10 bg-white/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={clsx('text-lg', option.color)}>{option.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="text-xs text-text-muted">Institutional routing</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs text-text-muted">Estimated Execution</p>
              <p className="text-sm">—</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Total Cost</p>
              <p className="text-sm">—</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={prepareIntent}
                className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-text-secondary"
              >
                Prepare Hash
              </button>
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="rounded-xl bg-accent-primary px-6 py-3 text-sm font-semibold text-white shadow-glass disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting…' : 'Submit Intent'}
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-text-secondary">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function parseBigint(value: string): bigint {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error('Amounts must be provided as whole numbers');
  }
  return BigInt(normalized);
}

function isHex(value: string): boolean {
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  return normalized.length > 0 && /^[0-9a-fA-F]+$/.test(normalized);
}
