import Link from 'next/link';
import { DocCode } from '@/components/DocCode';
import { DocCallout } from '@/components/DocCallout';

export default function SdkPage() {
  return (
    <article className="prose-docs">
      <h1>TypeScript SDK</h1>
      <p className="lead">
        <code>@blindmarkets/sdk</code> gives you everything you need to build on top of
        BlindMarkets — intent construction, encryption, gateway communication, and status
        polling. Works in Node.js and the browser.
      </p>

      <hr />

      <h2>Install</h2>
      <DocCode language="bash">{`npm install @blindmarkets/sdk`}</DocCode>
      <p>Or with yarn / pnpm / bun — same package name.</p>

      <hr />

      <h2>Initialize the client</h2>
      <p>
        The <code>GatewayClient</code> handles all HTTP communication. It retries on rate limits
        and server errors with exponential backoff, and cancels stalled requests after a
        configurable timeout.
      </p>
      <DocCode filename="client.ts" language="typescript">{`
import { GatewayClient } from '@blindmarkets/sdk';

const client = new GatewayClient({
  baseUrl: 'https://your-gateway.up.railway.app',
  apiKeyHeader: 'X-API-KEY',
  apiKey: process.env.GATEWAY_API_KEY!,
  timeoutMs: 10_000,
  maxRetries: 3,
  retryBaseDelayMs: 200,
  retryMaxDelayMs: 5_000,
  retryJitterMs: 100,
});
      `}</DocCode>

      <hr />

      <h2>Build an intent</h2>
      <p>
        <code>IntentBuilder</code> constructs the intent object and computes all the commitments
        your wallet needs to sign. It validates every field before returning — bad inputs throw
        a <code>ValidationError</code>, not a silent failure later.
      </p>
      <DocCode filename="build-intent.ts" language="typescript">{`
import { IntentBuilder } from '@blindmarkets/sdk';

const intent = new IntentBuilder()
  .userAddress('0xYOUR_WALLET_ADDRESS')
  .assetIn('0xSTRK_CONTRACT_ADDRESS')
  .assetOut('0xUSDC_CONTRACT_ADDRESS')
  .amount(1_000_000_000_000_000_000n)   // 1 STRK (18 decimals)
  .minOutput(2_000_000n)                 // 2 USDC (6 decimals)
  .maxFeeBps(50)                         // 0.5% max solver fee
  .deadlineSeconds(300n)                 // expires in 5 minutes
  .privacyMode('HIDDEN_AMOUNT')          // hide the amounts
  .build();
      `}</DocCode>
      <p>
        The builder generates a random nonce automatically and derives the intent ID, amount
        commitment, and intent hash from your inputs. You get back a fully formed{' '}
        <code>Intent</code> object.
      </p>

      <hr />

      <h2>Encrypt and submit</h2>
      <p>
        Before sending to the gateway, encrypt the intent using the gateway's public key.
        The encryption uses X25519 key exchange and AES-256-GCM — your actual amounts are never
        sent in plain text.
      </p>
      <DocCode filename="submit.ts" language="typescript">{`
import { encryptIntentForGateway, createCommitment } from '@blindmarkets/sdk';

// Fetch the gateway's current public key
const { gateway_public_key } = await client.getGatewayPublicKey();

// Encrypt the intent payload
const encrypted = await encryptIntentForGateway(intent, gateway_public_key);

// Build the on-chain commitment (for your wallet to sign)
const commitment = createCommitment(intent);

// Submit to gateway
const response = await client.submitIntent({
  intent_id: intent.intentId,
  user_address: intent.userAddress,
  ciphertext: encrypted.ciphertextHex,
  encrypted_session_key: encrypted.encryptedSessionKeyHex,
  client_public_key: encrypted.clientPublicKeyHex,
  commitment: commitment.intentHash,
  user_signature: [],   // filled in after wallet signs
  nonce: intent.nonce,
});

console.log(response.batch_id);                  // which batch window this landed in
console.log(response.awaiting_user_transaction); // true — wallet tx still needed
      `}</DocCode>

      <hr />

      <h2>Sign the commitment with the wallet</h2>
      <p>
        After submitting to the gateway, your wallet sends the on-chain commitment transaction.
        Use <code>starknet.js</code> or the wallet's provider to invoke{' '}
        <code>commit_intent</code> on the IntentRegistry contract:
      </p>
      <DocCode filename="commit-onchain.ts" language="typescript">{`
import { Contract, RpcProvider, WalletAccount } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.drpc.org' });
const account = new WalletAccount(provider, window.starknet);

const registry = new Contract(INTENT_REGISTRY_ABI, INTENT_REGISTRY_ADDRESS, account);

const tx = await registry.commit_intent(
  commitment.intentId,
  commitment.intentHash,
  commitment.amountCommitment,
  commitment.minOutputCommitment,
  commitment.maxFeeBps,
  commitment.deadline,
  privacyModeToFelt(commitment.privacyMode),
  commitment.nonce,
);

await provider.waitForTransaction(tx.transaction_hash);

// Tell the gateway the wallet tx confirmed
await client.reconcileOnchainIntent(intent.intentId, {
  action: 'COMMITTED',
  user_address: intent.userAddress,
  tx_hash: tx.transaction_hash,
});
      `}</DocCode>

      <DocCallout type="note" title="Why two steps?">
        Submitting to the gateway and committing on-chain are separate so the encrypted payload
        reaches the gateway before the on-chain fingerprint is visible. This prevents timing attacks
        where someone sees the chain tx and races to read the gateway.
      </DocCallout>

      <hr />

      <h2>Poll for status</h2>
      <DocCode filename="poll-status.ts" language="typescript">{`
const status = await client.getIntentStatus(intent.intentId);
// status.status: 'pending' | 'committed' | 'in_batch' | 'settled' | 'failed' | 'cancelled' | 'expired'

// Or list all your intents
const { intents } = await client.listIntents({
  userAddress: '0xYOUR_ADDRESS',
  status: 'settled',
  limit: 20,
  offset: 0,
});
      `}</DocCode>

      <hr />

      <h2>Error handling</h2>
      <p>The SDK throws two error types. Import them to catch specifically:</p>
      <DocCode filename="error-handling.ts" language="typescript">{`
import { ValidationError, NetworkError } from '@blindmarkets/sdk';

try {
  const intent = new IntentBuilder().build(); // throws — missing required fields
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Bad input:', e.message);
  }
  if (e instanceof NetworkError) {
    console.error('Gateway unreachable or returned an error:', e.message);
  }
}
      `}</DocCode>
      <ul>
        <li><code>ValidationError</code> — bad inputs, missing required fields, expired deadlines</li>
        <li><code>NetworkError</code> — gateway returned an error after all retries exhausted</li>
      </ul>

      <hr />

      <h2>Full type reference</h2>
      <p>All types are exported from the package root. The key ones:</p>
      <div className="not-prose space-y-2 my-4">
        {[
          ['Intent', 'The fully built order object returned by IntentBuilder.build()'],
          ['IntentCommitment', 'The on-chain commitment fields returned by createCommitment()'],
          ['PrivacyMode', "'PUBLIC' | 'HIDDEN_AMOUNT' | 'HIDDEN_DIRECTION_AND_AMOUNT'"],
          ['SubmitIntentRequest', 'Shape of the POST /v1/intents body'],
          ['IntentStatusResponse', 'What getIntentStatus() returns'],
          ['BatchListItem', 'One entry from listBatches()'],
          ['GatewayClientConfig', 'Constructor config for GatewayClient'],
        ].map(([name, desc]) => (
          <div key={name} className="glass-card rounded-xl px-4 py-3">
            <code style={{ color: 'var(--accent-primary)' }} className="text-sm">{name}</code>
            <p className="text-text-muted text-sm mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      <hr />

      <h2>Rust SDK</h2>
      <p>
        A Rust SDK lives in <code>client-sdk/</code> in the monorepo. Same concepts — intent
        construction, gateway client, retry logic. Useful if you're building a solver or a
        backend service that needs to interact with the gateway.
      </p>

      <DocCallout type="note">
        The Rust SDK is not yet published to crates.io. Add it as a path or git dependency for now.
      </DocCallout>

      <DocCode filename="Cargo.toml" language="toml">{`
[dependencies]
blindmarkets-sdk = { git = "https://github.com/winszns/blindmarkets", subdirectory = "client-sdk" }
      `}</DocCode>

      <div className="not-prose mt-8">
        <Link
          href="/docs/api"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(0,209,255,0.08)', color: 'var(--accent-primary)' }}
        >
          API Reference →
        </Link>
      </div>
    </article>
  );
}
