import Link from 'next/link';
import { DocStep, DocSteps } from '@/components/DocStep';
import { DocCallout } from '@/components/DocCallout';

export default function HowItWorks() {
  return (
    <article className="prose-docs">
      <h1>How It Works</h1>
      <p className="lead">
        From the moment you compose an order to the moment tokens land in your wallet — here's
        exactly what happens and why each step matters.
      </p>

      <hr />

      <h2>The full lifecycle</h2>

      <DocSteps>
        <DocStep n={1} title="You compose your order in the app">
          <p>
            You pick the token you want to sell, the token you want to receive, the amount, and a
            minimum output you're willing to accept. You also set a deadline — if the order isn't
            filled by then, it expires and nothing moves.
          </p>
          <p>
            You choose a <strong className="text-white">privacy level</strong>: whether solvers can
            see your full order, just the direction, or nothing at all until the batch closes.
          </p>
        </DocStep>

        <DocStep n={2} title="Your browser encrypts the order">
          <p>
            Before anything leaves your device, the SDK encrypts the order payload using
            AES-256-GCM with a one-time session key. That session key itself is encrypted with the
            gateway's public key using X25519 key exchange. The result is a ciphertext that
            only the gateway can decrypt — and only after the batch closes.
          </p>
          <p>
            Your actual amounts never travel in plain text. The gateway stores an encrypted blob.
          </p>
        </DocStep>

        <DocStep n={3} title="Your wallet signs a commitment on Starknet">
          <p>
            Your wallet sends a short transaction to the <strong className="text-white">IntentRegistry</strong> contract
            on Starknet. This transaction contains a fingerprint of your order (a Pedersen hash),
            not the order itself.
          </p>
          <p>
            This is the binding step. Once this transaction confirms, the order exists on-chain and
            neither you nor the gateway can change it retroactively. Your funds aren't moved yet —
            only your intent is recorded.
          </p>
        </DocStep>

        <DocStep n={4} title="Orders collect in a 30-second batch window">
          <p>
            The coordinator tracks time against a fixed schedule anchored to the genesis timestamp.
            When the current window closes, it announces the batch on-chain, sealing which orders
            belong to it. Orders that arrived after the cutoff roll into the next window.
          </p>
        </DocStep>

        <DocStep n={5} title="Solvers compete to fill the batch">
          <p>
            Once the batch is announced, solvers receive the decrypted orders from the gateway.
            Each solver independently computes a solution — routing through DEXes, filling from
            inventory, or matching orders against each other — and submits it to the{' '}
            <strong className="text-white">BatchAuction</strong> contract.
          </p>
          <p>
            The contract scores each solution. The score is a weighted mix of: how much output
            traders receive, how low the solver's fees are, and the solver's historical track
            record. The best score wins.
          </p>
        </DocStep>

        <DocStep n={6} title="The winning solution settles on-chain">
          <p>
            The <strong className="text-white">BatchSettlement</strong> contract verifies the
            winning solution against each order's on-chain commitment. If every fill is valid —
            amounts match, deadlines haven't passed, signatures check out — the token transfers
            execute atomically in a single transaction.
          </p>
          <p>
            Either the entire batch settles or none of it does. There's no state where some orders
            fill and others don't.
          </p>
        </DocStep>

        <DocStep n={7} title="Your app shows the result">
          <p>
            The observer watches Starknet for settlement events. When it sees the batch settle, it
            notifies the gateway, which marks your order as settled. The dashboard updates. You can
            verify the transaction on Voyager at any time.
          </p>
        </DocStep>
      </DocSteps>

      <DocCallout type="note" title="Batch windows are fixed-schedule, not per-order">
        Orders don't trigger batch boundaries. The coordinator opens and closes windows on a fixed
        30-second clock. Your order sits in the current open window until it closes — up to 30 seconds
        from submission.
      </DocCallout>

      <hr />

      <h2>What happens when a batch fails</h2>
      <p>
        Batches can fail for a few reasons: no solver submitted a valid solution within the auction
        window, the settlement transaction reverted, or a proof verification failed.
      </p>
      <p>
        When this happens, no funds move. The orders inside the failed batch are automatically
        requeued into the next open batch window. You don't need to resubmit anything.
      </p>

      <DocCallout type="tip">
        Solvers who submit consistently bad solutions — or who win auctions and then fail to settle
        — are slashed from their bond. Repeated failures result in blacklisting.
      </DocCallout>

      <hr />

      <h2>The five contracts</h2>
      <div className="not-prose space-y-3 my-4">
        {[
          {
            name: 'IntentRegistry',
            desc: 'Stores on-chain commitments. Your wallet talks to this contract when you place an order.',
          },
          {
            name: 'BatchAuction',
            desc: 'Runs the solver auction. Receives solver solutions, scores them, declares a winner.',
          },
          {
            name: 'BatchSettlement',
            desc: 'Executes the winning solution. Transfers tokens, verifies fills match commitments.',
          },
          {
            name: 'SolverBond',
            desc: 'Manages solver collateral. Solvers deposit a bond here; bad behaviour gets slashed from it.',
          },
          {
            name: 'AssetRegistry',
            desc: 'Whitelist of tokens that can be traded. New tokens require admin approval.',
          },
        ].map((c) => (
          <div key={c.name} className="glass-card rounded-xl px-4 py-3">
            <span className="font-mono text-cyan-400 text-sm">{c.name}</span>
            <p className="text-white/50 text-sm mt-0.5">{c.desc}</p>
          </div>
        ))}
      </div>
      <p>
        See <Link href="/docs/contracts">Deployed Addresses</Link> for all contract addresses on
        Sepolia.
      </p>
    </article>
  );
}
