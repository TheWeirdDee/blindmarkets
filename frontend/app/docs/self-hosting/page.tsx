import { DocCode } from '@/components/DocCode';
import { DocCallout } from '@/components/DocCallout';
import { DocStep, DocSteps } from '@/components/DocStep';

export default function SelfHostingPage() {
  return (
    <article className="prose-docs">
      <h1>Self-Hosting</h1>
      <p className="lead">
        The full BlindMarkets stack — gateway, coordinator, observer, and reference solver — can
        run on any machine with Docker. This page walks through deploying it yourself, pointed
        at the contracts already on Sepolia.
      </p>

      <hr />

      <h2>What you're running</h2>
      <div className="not-prose space-y-2 my-4">
        {[
          { name: 'gateway', desc: 'Rust API server. Accepts intents, manages the database, relays to solvers.' },
          { name: 'coordinator', desc: 'Rust scheduler. Opens and closes batch windows on-chain every 30 seconds.' },
          { name: 'observer', desc: 'Rust indexer. Watches Starknet for settlement events and updates the database.' },
          { name: 'postgres', desc: 'Database for intents, batches, and audit history.' },
          { name: 'redis', desc: 'Rate limit counters and nonce windows. Lost on restart — no persistent state.' },
        ].map((s) => (
          <div key={s.name} className="glass-card rounded-xl px-4 py-3 flex gap-3">
            <code style={{ color: 'var(--accent-primary)' }} className="text-xs shrink-0 pt-0.5">{s.name}</code>
            <p className="text-text-muted text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
      <p>
        The frontend is a separate Next.js app deployed on Vercel. It talks to the gateway over
        HTTP — you only need to point it at your gateway URL.
      </p>

      <hr />

      <h2>Prerequisites</h2>
      <ul>
        <li>Docker and Docker Compose installed</li>
        <li>A funded Starknet Sepolia account (for the coordinator and gateway to send transactions)</li>
        <li>The repo cloned locally</li>
      </ul>

      <hr />

      <h2>1. Clone and configure</h2>
      <DocCode language="bash">{`
git clone https://github.com/winszns/blindmarkets
cd blindmarkets
cp .env.compose.example .env
      `}</DocCode>
      <p>Open <code>.env</code> and fill in:</p>
      <ul>
        <li><strong>GATEWAY_API_KEY</strong> — any random string, e.g. <code>openssl rand -hex 32</code></li>
        <li><strong>GATEWAY_ACCOUNT_ADDRESS</strong> and <strong>GATEWAY_ACCOUNT_PRIVATE_KEY</strong> — your Starknet account</li>
        <li><strong>COORDINATOR_ACCOUNT_ADDRESS</strong> and <strong>COORDINATOR_PRIVATE_KEY</strong> — your Starknet account (can be the same for testnet)</li>
      </ul>
      <p>
        Everything else — contract addresses, RPC URL, event keys — is already filled in with the
        Sepolia deployment values.
      </p>

      <DocCallout type="warning" title="Keep your private key out of git">
        The <code>.env</code> file is in <code>.gitignore</code> by default. Never commit it.
        Use <code>openssl rand -hex 32</code> to generate a strong API key.
      </DocCallout>

      <hr />

      <h2>2. Register your gateway</h2>
      <p>
        The gateway account must be registered in the GatewayRegistry contract before it can relay
        intents. Run this once:
      </p>
      <DocCode language="bash">{`
sncast --account your_account invoke \\
  --network sepolia \\
  --contract-address 0x0572569d692b6711f7da40d9d196bccf56b703cf8dafe03580aa713e974557b0 \\
  --function register_gateway \\
  --calldata YOUR_GATEWAY_ADDRESS YOUR_GATEWAY_PUBLIC_KEY
      `}</DocCode>
      <p>
        To get your public key: <code>sncast account list</code> — look for the{' '}
        <code>public key</code> field next to your account.
      </p>

      <hr />

      <h2>3. Start the stack</h2>
      <DocCode language="bash">{`docker compose up --build`}</DocCode>
      <p>
        First build takes a few minutes — Rust compiles from source. After that, rebuilds are
        much faster because Docker caches the dependency layer.
      </p>
      <p>Services come up in order: postgres and redis first, then gateway, then coordinator and
      observer once the gateway is healthy.</p>

      <h3>Local URLs</h3>
      <table>
        <tbody>
          <tr><td>Gateway API</td><td><code>http://localhost:3000</code></td></tr>
          <tr><td>Health check</td><td><code>http://localhost:3000/health</code></td></tr>
          <tr><td>PostgreSQL</td><td><code>localhost:5432</code></td></tr>
          <tr><td>Redis</td><td><code>localhost:6379</code></td></tr>
        </tbody>
      </table>

      <hr />

      <h2>4. Point the frontend at your gateway</h2>
      <p>
        In your Vercel project settings (or your local <code>frontend/.env.local</code>), set:
      </p>
      <DocCode filename=".env.local">{`
GATEWAY_URL=http://localhost:3000       # or your public URL
GATEWAY_API_KEY=your-api-key
GATEWAY_API_KEY_HEADER=X-API-KEY
      `}</DocCode>

      <hr />

      <h2>Deploying on Railway</h2>
      <p>
        The easiest way to run the backend publicly is Railway. Create a project, add PostgreSQL
        and Redis plugins, then add three services from the same GitHub repo:
      </p>
      <table>
        <thead>
          <tr><th>Service</th><th>RAILWAY_DOCKERFILE_PATH</th></tr>
        </thead>
        <tbody>
          <tr><td>gateway</td><td><code>backend/gateway/Dockerfile</code></td></tr>
          <tr><td>coordinator</td><td><code>backend/coordinator/Dockerfile</code></td></tr>
          <tr><td>observer</td><td><code>backend/observer/Dockerfile</code></td></tr>
        </tbody>
      </table>
      <p>
        Set env vars from your <code>.env</code> in each service's Variables tab. For
        coordinator and observer, replace <code>GATEWAY_URL</code> with{' '}
        <code>http://gateway.railway.internal:3000</code>.
      </p>
      <p>
        Replace <code>DATABASE_URL</code> and <code>REDIS_URL</code> with Railway's reference
        syntax: <code>{'${{Postgres.DATABASE_URL}}'}</code> and{' '}
        <code>{'${{Redis.REDIS_URL}}'}</code>.
      </p>

      <DocCallout type="tip" title="Internal networking saves egress costs">
        Using <code>gateway.railway.internal:3000</code> instead of the public URL routes traffic
        internally within Railway. This avoids egress charges and is faster.
      </DocCallout>

      <hr />

      <h2>Running a solver</h2>
      <p>
        The reference solver in <code>solver-reference/</code> demonstrates the full solver
        loop: polling the gateway for open batches, computing a solution, and submitting it
        on-chain. To run it:
      </p>
      <DocCode language="bash">{`
# Add to docker-compose.yml services or run directly:
SOLVER_ACCOUNT_ADDRESS=0x... \\
SOLVER_ACCOUNT_PRIVATE_KEY=0x... \\
GATEWAY_URL=http://localhost:3000 \\
GATEWAY_API_KEY=your-key \\
cargo run --release -p blindmarkets-solver
      `}</DocCode>

      <DocCallout type="note" title="Bond required before a solver can submit">
        A solver must have a bond deposited in the SolverBond contract before it can submit
        solutions. The minimum bond is 1 STRK. See the{' '}
        <a
          href="https://sepolia.voyager.online/contract/0x069db55d725a0a4f48705ebecf0993e455e2b3716940081005b48d779e7301e8"
          target="_blank"
          rel="noreferrer"
        >
          SolverBond contract on Voyager
        </a>{' '}
        to deposit.
      </DocCallout>
    </article>
  );
}
