import Link from 'next/link';

export default function DocsIntroduction() {
  return (
    <article className="prose-docs">
      <h1>BlindMarkets</h1>
      <p className="lead">
        A trading venue on Starknet where your order stays hidden until after the batch closes —
        so bots can never see it before it fills.
      </p>

      <hr />

      <h2>The problem</h2>
      <p>
        On a standard DEX, every order you place is publicly visible the moment you submit it.
        Bots watch the mempool, spot your order, and buy the asset ahead of you. By the time your
        transaction confirms, the price has already moved against you. On large trades this can cost
        several percent of the entire order. The industry has a name for it: front-running.
      </p>
      <p>
        The core issue is timing. Your order is visible before it's filled, which creates a window
        for anyone watching to act on it. Close that window and front-running stops.
      </p>

      <h2>How BlindMarkets closes the window</h2>
      <p>
        Instead of placing orders directly on a DEX, you submit them to BlindMarkets encrypted.
        The gateway holds a pool of encrypted orders. Every 30 seconds, the pool closes. Only then
        are orders decrypted and handed to solvers, who compete to fill them at the best price.
        By the time anyone can read what you ordered, the price is already locked.
      </p>

      <h2>Who this is for</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose my-6">
        {[
          {
            title: 'Traders',
            desc: 'Swap tokens without bots front-running your order. Works for any size.',
            href: '/docs/traders',
          },
          {
            title: 'Developers',
            desc: 'Integrate with our TypeScript SDK or REST API. Open source, MIT licensed.',
            href: '/docs/sdk',
          },
          {
            title: 'Solvers',
            desc: 'Post a bond, compete to fill batches, earn fees. The best fill wins the auction.',
            href: '/docs/solvers',
          },
          {
            title: 'Infrastructure teams',
            desc: 'Run your own gateway and solver. Self-hosted in under an hour.',
            href: '/docs/self-hosting',
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block glass-card p-4 rounded-xl hover:border-cyan-400/30 transition-colors no-underline"
          >
            <p className="font-semibold text-white text-sm mb-1">{card.title}</p>
            <p className="text-white/50 text-sm">{card.desc}</p>
          </Link>
        ))}
      </div>

      <h2>What's live right now</h2>
      <p>
        BlindMarkets is deployed on <strong>Starknet Sepolia testnet</strong>. All six contracts are
        live and wired. The gateway, coordinator, and observer run continuously. You can place real
        test orders today.
      </p>
      <p>
        See <Link href="/docs/contracts">Deployed Addresses</Link> for the full list of contract
        addresses.
      </p>

      <h2>Open source</h2>
      <p>
        Every part of the stack is open source — contracts, backend services, frontend, and both
        SDKs. You can read the code, run it yourself, or build on top of it.
      </p>

      <div className="not-prose mt-8 flex gap-3">
        <Link
          href="/docs/how-it-works"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-colors"
        >
          How it works →
        </Link>
        <Link
          href="/docs/sdk"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-white/70 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          TypeScript SDK →
        </Link>
      </div>
    </article>
  );
}
