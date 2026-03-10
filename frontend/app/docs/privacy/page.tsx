export default function PrivacyModesPage() {
  return (
    <article className="prose-docs">
      <h1>Privacy Modes</h1>
      <p className="lead">
        You decide how much information leaves your device before the batch closes. Three modes,
        different trade-offs.
      </p>

      <hr />

      <h2>Why it matters</h2>
      <p>
        Even in a blind pool, metadata leaks. If solvers can see that someone wants to buy a large
        amount of a thinly traded token, they can position themselves before the batch settles.
        Privacy modes let you control exactly how much of that signal you emit.
      </p>

      <hr />

      <div className="not-prose space-y-4 my-6">
        {[
          {
            mode: 'Public',
            badge: 'bg-white/10 text-text-secondary',
            tagline: 'Full visibility after the batch closes',
            rows: [
              ['Asset pair (e.g. BTC → USDC)', 'Visible to solvers'],
              ['Exact amount', 'Visible to solvers'],
              ['Minimum output', 'Visible to solvers'],
              ['Your wallet address', 'Visible to solvers'],
            ],
            when: 'Small orders where front-running risk is low and you want maximum solver competition.',
          },
          {
            mode: 'Hidden Amount',
            badge: 'bg-accent-warning/10 text-accent-warning',
            tagline: 'Direction visible, amounts hidden until settlement',
            rows: [
              ['Asset pair (e.g. BTC → USDC)', 'Visible to solvers'],
              ['Exact amount', 'Hidden — only a commitment hash'],
              ['Minimum output', 'Hidden — only a commitment hash'],
              ['Your wallet address', 'Visible to solvers'],
            ],
            when: 'Mid-size orders where you want solvers to know the direction but not the size.',
          },
          {
            mode: 'Hidden',
            badge: 'bg-accent-primary/10 text-accent-primary',
            tagline: 'Nothing visible until after the batch closes',
            rows: [
              ['Asset pair', 'Hidden — encrypted payload only'],
              ['Exact amount', 'Hidden — encrypted payload only'],
              ['Minimum output', 'Hidden — encrypted payload only'],
              ['Your wallet address', 'Visible (it's on Starknet)'],
            ],
            when: 'Large orders, sensitive positions, or any situation where you don\'t want to signal intent.',
          },
        ].map((item) => (
          <div key={item.mode} className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.badge}`}>
                {item.mode}
              </span>
            </div>
            <p className="text-text-muted text-sm mb-3">{item.tagline}</p>
            <table className="w-full text-sm">
              <tbody>
                {item.rows.map(([field, visibility]) => (
                  <tr key={field} className="border-t border-white/5">
                    <td className="py-1.5 pr-4 text-text-secondary">{field}</td>
                    <td className="py-1.5 text-text-muted text-right">{visibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-text-muted mt-3 pt-3 border-t border-white/5">
              <span className="text-text-secondary font-medium">Use when: </span>{item.when}
            </p>
          </div>
        ))}
      </div>

      <hr />

      <h2>What's always visible</h2>
      <p>
        Regardless of privacy mode, your wallet address is always visible on-chain — it's the
        account that signed the commitment transaction on Starknet. If your wallet address is
        known, the fact that you placed <em>an</em> order is public even in Hidden mode. What
        stays hidden is what you ordered and for how much.
      </p>

      <h2>How amounts stay hidden</h2>
      <p>
        When you pick Hidden Amount or Hidden mode, your browser computes a{' '}
        <strong>Pedersen hash</strong> of the amount and a random nonce. This hash — called the
        amount commitment — is what goes on-chain and what solvers see. The actual number is never
        written to the chain.
      </p>
      <p>
        When the batch settles, the BatchSettlement contract checks that the solver's fill matches
        the commitment. If the numbers don't match the hash, the transaction reverts.
      </p>

      <h2>Does privacy mode affect my fill price?</h2>
      <p>
        Slightly, in practice. In Hidden mode, solvers have less information to work with, so they
        may price their solutions more conservatively. Public mode gives solvers the most to work
        with and typically produces the tightest competition on price. For most orders the
        difference is negligible.
      </p>
    </article>
  );
}
