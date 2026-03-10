import Link from 'next/link';

export default function TradersPage() {
  return (
    <article className="prose-docs">
      <h1>Placing an Order</h1>
      <p className="lead">
        You don't need an account. You don't need to register. You need a Starknet wallet with
        the tokens you want to swap, and a few seconds.
      </p>

      <hr />

      <h2>Before you start</h2>
      <p>
        BlindMarkets currently runs on <strong>Starknet Sepolia testnet</strong>. To place a real
        order you'll need:
      </p>
      <ul>
        <li>An Argent X or Braavos wallet connected to Sepolia</li>
        <li>STRK for gas fees (free from the <a href="https://starknet-faucet.vercel.app" target="_blank" rel="noreferrer">Starknet faucet</a>)</li>
        <li>The token you want to swap — it must be whitelisted in the AssetRegistry</li>
      </ul>

      <hr />

      <h2>Step by step</h2>

      <h3>1. Connect your wallet</h3>
      <p>
        Click <strong>Connect Wallet</strong> in the top right. Argent X and Braavos are both
        supported. Your address will appear in the nav once connected. Nothing happens on-chain
        at this point — the connection is read-only until you submit an order.
      </p>

      <h3>2. Open the Intent Composer</h3>
      <p>
        Go to the <strong>Dashboard</strong>. The form on the left is where you build your order.
        Fill in:
      </p>
      <ul>
        <li><strong>Sell</strong> — the token you're giving up and how much</li>
        <li><strong>Receive</strong> — the token you want and the minimum amount you'll accept</li>
        <li><strong>Max fee</strong> — the most you're willing to pay the solver, in basis points (50 = 0.5%)</li>
        <li><strong>Deadline</strong> — how many minutes before the order expires if unfilled</li>
        <li><strong>Privacy</strong> — see <Link href="/docs/privacy">Privacy Modes</Link> for what each option hides</li>
      </ul>

      <h3>3. Review and submit</h3>
      <p>
        Hit <strong>Submit Order</strong>. Two things happen:
      </p>
      <ol>
        <li>
          Your browser encrypts the order and sends it to the gateway. The gateway stores it but
          cannot read the amounts until the batch closes.
        </li>
        <li>
          Your wallet opens a signing prompt. This is the on-chain commitment — a transaction
          that records a fingerprint of your order on Starknet. Approve it.
        </li>
      </ol>
      <p>
        Once the wallet transaction confirms, your order is live. It will sit in the current batch
        window until the window closes (up to 30 seconds).
      </p>

      <h3>4. Wait for settlement</h3>
      <p>
        You don't need to do anything else. The Dashboard shows your order's status in real time:
      </p>
      <div className="not-prose my-4 space-y-2">
        {[
          { status: 'Pending', color: 'text-text-muted', dot: 'bg-text-muted', desc: 'Submitted, waiting to be included in a batch' },
          { status: 'Committed', color: 'text-accent-warning', dot: 'bg-accent-warning', desc: 'Wallet transaction confirmed on Starknet' },
          { status: 'In Auction', color: 'text-accent-primary', dot: 'bg-accent-primary', desc: 'Solvers are competing to fill this batch' },
          { status: 'Settled', color: 'text-accent-success', dot: 'bg-accent-success', desc: 'Filled. Tokens are in your wallet.' },
          { status: 'Failed', color: 'text-accent-danger', dot: 'bg-accent-danger', desc: 'Batch failed. Order will be requeued.' },
        ].map((s) => (
          <div key={s.status} className="flex items-start gap-3 glass-card rounded-xl px-4 py-3">
            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
            <div>
              <span className={`text-sm font-semibold ${s.color}`}>{s.status}</span>
              <span className="text-text-muted text-sm"> — {s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <h3>5. Verify on-chain</h3>
      <p>
        Every settlement is a real Starknet transaction. Go to{' '}
        <a href="https://sepolia.starkscan.co" target="_blank" rel="noreferrer">Starkscan</a> and
        look up your wallet address to see the full history of your commits and settlements.
      </p>

      <hr />

      <h2>Can I cancel an order?</h2>
      <p>
        Yes, while the order is still in <strong>Pending</strong> or <strong>Committed</strong>
        status and hasn't been included in an active auction yet. Go to the Audit Log page, find
        your order, and hit Cancel. Your wallet will sign a cancellation transaction.
      </p>
      <p>
        Once an auction has started on a batch your order is in, it cannot be cancelled — the
        process is already underway.
      </p>

      <hr />

      <h2>What if no solver fills my order?</h2>
      <p>
        If the batch your order is in fails — either because no solver bid, or the settlement
        transaction failed — your order is automatically moved to the next batch window. Nothing
        moves from your wallet until a successful settlement. You can also cancel at that point
        if you'd rather not wait.
      </p>

      <div className="not-prose mt-8">
        <Link
          href="/docs/privacy"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(0,209,255,0.08)', color: 'var(--accent-primary)' }}
        >
          Privacy Modes →
        </Link>
      </div>
    </article>
  );
}
