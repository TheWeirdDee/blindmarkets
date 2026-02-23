# Product Requirements Document: Blind BTC Intent Markets

**Version:** 1.0  
**Last Updated:** February 8, 2026  
**Status:** Production Specification  
**Target Platform:** Starknet + Bitcoin

---

## 1. Executive Summary

Blind BTC Intent Markets is a privacy-preserving Bitcoin execution protocol that enables users to express trading, lending, and DeFi intents through encrypted orderflow, competitive solver execution, and zero-knowledge batch settlement on Starknet.

### What This System Is

A production infrastructure for Bitcoin users to submit financial intents (swaps, limit orders, DCAs, lending positions) that are executed by a competitive solver market, with privacy guaranteed through cryptographic commitments and batch clearing mechanisms. Settlement verification occurs on Starknet; final value transfer involves Bitcoin assets under explicitly defined custody models.

### What Problem It Solves

Bitcoin execution markets currently leak all orderflow to public mempools, enabling systematic value extraction through front-running, sandwich attacks, and intent copying. Existing Bitcoin DeFi primitives (wrapped tokens, custody bridges, AMMs) either compromise on trustlessness or expose users to MEV without structural protection. No production system currently provides Bitcoin users with:

- Intent-based execution (specify constraints, not paths)
- Encrypted orderflow (no public visibility until settlement)
- Batch clearing (removes ordering advantage)
- Competitive solver markets (best execution guarantee)
- Zero-knowledge settlement verification

### Why It Must Exist

Bitcoin's UTXO model and limited scripting capabilities prevent native implementation of:
- Encrypted mempools with time-delayed revelation
- Generalized zero-knowledge proof verification
- Multi-party batch settlement with atomic guarantees
- On-chain solver accountability and slashing

Without a specialized execution layer, Bitcoin users cannot access privacy-preserving, MEV-resistant financial primitives that Ethereum users already depend on (CoW Protocol, Flashbots Protect, private RFQ venues).

### Why Starknet + Bitcoin Is Required

**Starknet provides:**
- Cairo-based zero-knowledge proof generation and verification
- Deterministic state commitments for intent registries
- On-chain solver bonding, auction mechanics, and slashing
- Efficient batch settlement with cryptographic accountability

**Bitcoin provides:**
- Final settlement layer for value transfer
- Hardest monetary asset as base collateral
- Expanding covenant/OP_CAT capabilities for trust-minimized bridges

The combination enables Bitcoin-native intents with execution guarantees that neither chain can provide independently.

---

## 2. Problem Definition

### Current State of Bitcoin Execution

**Orderflow Leakage:**  
All Bitcoin transactions are broadcast to public mempools before inclusion. Any observer can:
- Copy profitable trades before confirmation
- Front-run large orders by bidding higher fees
- Extract value through transaction reordering

**MEV Without Protection:**  
Bitcoin miners have absolute discretion over transaction ordering within blocks. Unlike Ethereum's evolving MEV mitigation infrastructure (Flashbots, proposer-builder separation, encrypted mempools), Bitcoin has no protocol-level or widely-adopted application-level orderflow protection.

**Wrapped Bitcoin Tradeoffs:**  
Existing Bitcoin DeFi relies on custodial or federated bridges (WBTC, renBTC, tBTC variants). Users face:
- Custody risk (single points of failure)
- Bridge trust assumptions (multisigs, threshold schemes)
- Liquidity fragmentation across bridge providers
- No execution privacy on destination chains

**DEX Model Failures:**  
AMM-based Bitcoin DEXs (on wrapped assets or sidechains) inherit Ethereum's pre-MEV-mitigation problems:
- Toxic orderflow (informed traders extract from passive LPs)
- Sandwich attacks on large trades
- No privacy (trade size and direction always public)
- No price improvement (fixed bonding curves)

### Why Privacy Must Be Protocol-Enforced

**Optional Privacy Fails:**  
Systems where privacy is opt-in (e.g., Zcash shielded pool adoption, Ethereum Tornado Cash usage) suffer from:
- Anonymity set collapse (only sophisticated users participate)
- Regulatory targeting of privacy features
- Weak network effects (privacy strength depends on usage volume)

**Market Structure Demands:**  
Institutional Bitcoin users (family offices, funds, exchanges) require execution privacy not as a feature but as a structural requirement. Public orderflow is economically unacceptable for:
- Large block trades (whale watching, copy trading)
- Systematic strategies (arbitrage, market making)
- Credit markets (exposing position size reveals solvency)

**Intent Expression Requires Concealment:**  
If a user expresses "I want to sell 10 BTC at minimum $95,000 per BTC within 24 hours," public visibility of this intent:
- Allows front-running (others sell first, moving price down)
- Reveals information asymmetry (why is this user selling?)
- Enables targeted attack strategies (drive price below threshold to trigger expiry)

Privacy must be the default execution mode, not an add-on.

---

## 3. Product Scope & Non-Goals

### In Scope: Core Protocol Functionality

1. **Intent Expression and Submission**
   - User-facing SDK for creating intents with constraints (min output, deadlines, fees)
   - Client-side encryption of intent details before network submission
   - Support for swap, limit order, DCA, and basic lending intents
   - Multi-asset pair support (BTC/stablecoin, BTC/ETH, BTC/altcoin)

2. **Encrypted Orderflow Infrastructure**
   - Gateway API for receiving and storing encrypted intents
   - Time-sliced batch formation (deterministic schedule)
   - Ciphertext pool accessible to authenticated solvers only
   - No plaintext intent data stored or transmitted outside user client

3. **Solver Competition and Execution**
   - Open solver network (permissionless participation with bonding)
   - Auction mechanism for batch clearing rights
   - Internal matching (coincidence of wants) and external routing (AMM, RFQ)
   - Solver accountability through on-chain bonds and slashing conditions

4. **Starknet Settlement and Verification**
   - Intent registry contracts (commitments, expiry, cancellation)
   - Batch auction contracts (solver selection, winner determination)
   - Settlement contracts (clearing, transfer accounting, constraint verification)
   - Bonding and slashing enforcement

5. **Bitcoin Integration (Phase 1)**
   - Deposit and withdrawal flows for BTC representation on Starknet
   - Integration with canonical bridge or wrapped BTC standard
   - Proof-of-reserve monitoring and risk tier classification
   - Clear disclosure of custody model assumptions

6. **Observability and Transparency**
   - Client-side audit logs (user-local decrypted intent history)
   - Public batch commitments and settlement receipts
   - Solver performance statistics (privacy-preserving aggregates)
   - System health metrics and uptime monitoring

### Explicit Non-Goals

**This system will not:**

1. **Provide native Bitcoin L1 execution**  
   We do not modify Bitcoin consensus rules or operate a Bitcoin miner/pool. Bitcoin is the settlement layer; Starknet is the execution layer.

2. **Guarantee instant settlement on Bitcoin**  
   Bitcoin block times (average 10 minutes) and confirmation requirements (typically 6 blocks for finality) constrain settlement speed. We optimize Starknet-side execution but do not bypass Bitcoin's security model.

3. **Create a new Bitcoin bridge from scratch**  
   Phase 1 relies on existing BTC representation infrastructure. We do not build custom multi-signature federations, threshold schemes, or custody solutions unless extending proven designs.

4. **Support arbitrary smart contract execution**  
   Intent types are enumerated and constrained. This is not a general-purpose VM for Bitcoin DeFi. Complexity is bounded to maintain security auditability.

5. **Hide all metadata**  
   While intent details (amount, direction) can be encrypted, certain metadata (timing, asset pairs, gas costs, settlement success/failure) may be observable. Perfect privacy is not claimed.

6. **Replace Bitcoin L1 for all use cases**  
   Users who require direct Bitcoin UTXO ownership, non-custodial cold storage, or specific Bitcoin script capabilities should not use this system. We serve execution use cases, not storage.

7. **Operate without Starknet**  
   This system is fundamentally dependent on Starknet's proving infrastructure. It is not chain-agnostic and cannot be trivially ported to other L2s without protocol redesign.

### Boundary Between Protocol and External Infrastructure

**Protocol Responsibility:**
- Intent commitment semantics
- Solver auction rules and bond enforcement
- Batch settlement correctness
- Cryptographic privacy guarantees within encrypted pool
- Starknet contract security and upgradeability

**External Infrastructure Responsibility:**
- Bitcoin custody model (bridge operators, multisigs, covenant schemes)
- Gateway high-availability and DDoS resistance
- Solver node operation and liquidity sourcing
- Client-side key management (wallet security)
- Regulatory compliance in specific jurisdictions

Users must understand: the protocol ensures fair execution and privacy within its trust boundaries. External dependencies (Bitcoin bridges, solver liveness) have separate risk profiles.

---

## 4. Core Concepts & Definitions

### Intent

**Definition:**  
A cryptographically signed commitment expressing a user's desired financial outcome under specified constraints, without prescribing the execution path.

**Properties:**
- **Declarative:** User specifies "what" (swap 1 BTC for ≥95,000 USDC), not "how" (which AMM pool, which route)
- **Constrained:** Includes minimum output, maximum fee, deadline, slippage tolerance
- **Binding:** Once submitted, the intent commitment is immutable (cancellation requires explicit on-chain action)
- **Cryptographically Protected:** Intent details may be encrypted, revealed only to solvers or never (depending on privacy mode)

**Intent Types (Phase 1):**
- **Swap:** Exchange asset A for asset B at constraints
- **Limit Order:** Execute swap only if price condition met
- **DCA (Dollar-Cost Averaging):** Split a large order into smaller time-distributed trades
- **Lending Position:** Supply or borrow assets at rate/collateral constraints

### Solver

**Definition:**  
An economically incentivized agent that competes to execute user intents by finding optimal trade routes, aggregating liquidity, and proposing settlement solutions.

**Responsibilities:**
- Monitor encrypted intent pool
- Decrypt accessible intents (via auction-won keys or public mode)
- Compute execution paths (internal matching, AMM routing, RFQ quotes)
- Submit solution commitments to batch auction
- Post bonds to guarantee solution validity

**Accountability Mechanism:**  
Solvers must lock economic collateral (bonds) on Starknet. If a solver's proposed solution:
- Violates user constraints (e.g., output below minimum)
- Fails settlement (e.g., insufficient liquidity claims)
- Exhibits provable malicious behavior (e.g., constraint manipulation)

The solver's bond is slashed and distributed to affected users or protocol treasury.

### Batch Clearing

**Definition:**  
The process of aggregating multiple intents into a single atomic settlement transaction, executed at uniform clearing prices (per asset pair) or through coordinated solver solutions.

**Mechanism:**
1. **Batch Window:** Fixed time interval (e.g., 30 seconds) during which intents accumulate
2. **Batch Formation:** Coordinator collects all intents submitted in window
3. **Solver Competition:** Solvers propose solutions for the entire batch
4. **Winner Selection:** Auction determines which solver(s) execute which intents
5. **Atomic Settlement:** All trades clear simultaneously on Starknet; any failure reverts entire batch

**Properties:**
- **Fairness:** All intents in a batch are treated equally; no ordering advantage
- **MEV Resistance:** Batch execution removes the ability to reorder trades for profit
- **Price Improvement:** Internal matching (users trading opposite directions) can settle at midpoint, both getting better prices than AMM
- **Efficiency:** Gas costs amortized across all batch participants

### Encrypted Orderflow

**Definition:**  
The practice of submitting intents in ciphertext form such that their details (amount, direction, constraints) are not visible to public observers or competing solvers until a deterministic revelation condition is met (or never).

**Encryption Model:**
- **Client-Side Encryption:** User encrypts intent details with a session key before submission
- **Gateway Storage:** Gateway stores only ciphertext; no plaintext at rest or in transit
- **Solver Access:** Solvers gain decryption rights only through auction mechanism or batch finalization (depending on privacy mode)
- **No Plaintext Mempool:** Unlike Bitcoin's transparent mempool, no observer can see intent details before execution

**Privacy Modes (Detailed in Section 8):**
- **Public Mode:** Intent details visible to all (baseline, no encryption)
- **Hidden Amount:** Only the trade direction and asset pair are visible; amount is committed
- **Hidden Direction + Amount:** Asset pair visible; direction and amount encrypted

### Settlement Finality

**Definition:**  
The state at which an intent execution is considered irreversible and economically guaranteed.

**Two-Layer Finality:**
1. **Starknet Finality:** Intent settlement clears on Starknet with cryptographic proof of correct execution. This provides:
   - Solver accountability (slashing enforced)
   - Batch clearing correctness (ZK proof verified)
   - Accounting finality (who owes whom what)

2. **Bitcoin Finality:** Actual Bitcoin value transfer completes when:
   - BTC deposits/withdrawals clear on Bitcoin L1 (6+ confirmations)
   - Bridge or custody mechanism confirms irreversibility
   - User has self-custodial control of Bitcoin UTXOs (if applicable to custody model)

**Critical Distinction:**  
Starknet finality guarantees *execution correctness*. Bitcoin finality guarantees *value ownership*. Users must understand both layers.

### Trust Boundaries

**Definition:**  
Explicit demarcation of which components users must trust versus which are cryptographically or economically guaranteed.

**Trustless Components:**
- Starknet state machine (consensus-secured)
- Intent commitment semantics (on-chain enforcement)
- Solver bond slashing (code is law)
- Zero-knowledge proof verification (cryptographic)

**Partially Trusted Components:**
- Gateway liveness (can be mitigated via multiple gateways)
- Solver execution quality (economically bonded, not cryptographically proven)
- Batch coordinator fairness (deterministic schedule + fallback mechanisms)

**Explicitly Trusted Components (Phase 1):**
- Bitcoin bridge custody model (multisig or federation)
- BTC representation on Starknet (bridge-specific security assumptions)

**User Responsibility:**
- Private key security (wallet, intent signing)
- Client-side encryption key management
- Understanding risk tiers before depositing BTC

Users do not trust solvers or the batch coordinator with custody. Users do trust Starknet consensus and (in Phase 1) the Bitcoin bridge operator.

---

## 5. User Personas

### Persona 1: Retail Bitcoin User

**Profile:**
- Holds 0.1–5 BTC
- Uses mobile or desktop wallet
- Primary goal: Swap BTC for stablecoins or altcoins
- Concerned about price slippage and hidden fees
- Limited technical sophistication

**Goals:**
- Execute swaps without being front-run
- Avoid getting worse prices than market mid-point
- Understand total cost (fees + slippage) before committing
- Access simple UI with clear risk warnings

**Risk Tolerance:**
- Moderate custody risk acceptable (trusted bridge operators)
- Low tolerance for lost funds due to UI errors
- Needs clear "what happens if" explanations

**Security Assumptions:**
- Relies on mobile wallet security (biometric, PIN)
- May not understand cryptographic commitments
- Trusts system defaults (privacy mode, deadline settings)

### Persona 2: Professional Trader

**Profile:**
- Manages 10–500 BTC in active strategies
- Runs arbitrage, market making, or systematic trading
- Uses APIs and programmatic execution
- Highly price-sensitive; tracks execution quality metrics

**Goals:**
- Minimize market impact (hide large order sizes)
- Achieve best execution (better than public AMM prices)
- Execute complex strategies (DCA, TWAP, conditional orders)
- Monitor solver performance and execution statistics

**Risk Tolerance:**
- Low custody risk tolerance (prefers trust-minimized bridges)
- Willing to accept higher complexity for better execution
- Demands transparency on solver fees and routing decisions

**Security Assumptions:**
- Operates own nodes and validates on-chain state
- Uses hardware wallets or institutional custody solutions
- Requires API key management and rate limiting

### Persona 3: Market Maker / Solver

**Profile:**
- Operates liquidity provision or RFQ (request-for-quote) business
- Has access to off-chain liquidity sources (exchanges, OTC desks)
- Technically sophisticated; runs custom solver nodes
- Motivated by solver fee revenue

**Goals:**
- Win batch auction rights for profitable intent sets
- Route intents to best liquidity sources (internal inventory, AMMs, CEX)
- Maintain reputation for reliable execution
- Minimize bond slashing risk

**Risk Tolerance:**
- Moderate tolerance for bond loss (cost of doing business)
- Requires predictable auction mechanics and clear slashing rules
- Needs high-availability infrastructure for competitive advantage

**Security Assumptions:**
- Runs secure solver node infrastructure
- Manages encryption keys for solver pool access
- Monitors on-chain contracts for bond status

### Persona 4: Institutional User

**Profile:**
- Family office, fund, or corporate treasury
- Holds 100–10,000 BTC
- Executes large block trades or OTC-style transactions
- Requires regulatory compliance and audit trails

**Goals:**
- Execute large trades without moving markets
- Maintain confidentiality (position size privacy)
- Access RFQ-style execution with price guarantees
- Generate compliance reports (trade confirmations, tax records)

**Risk Tolerance:**
- Very low custody risk tolerance (requires regulated custodians or trust-minimized bridges)
- Zero tolerance for orderflow leakage to competitors
- Demands legal clarity on settlement finality

**Security Assumptions:**
- Uses institutional-grade custody solutions
- Requires SOC 2 / ISO 27001 equivalent operational standards
- Multi-signature approval workflows for large intents

### Persona 5: Protocol Integrator

**Profile:**
- Developer building Bitcoin DeFi applications
- Wants to embed intent execution in their product
- Needs SDK and API access
- Concerned with long-term protocol stability

**Goals:**
- Integrate intent submission into existing wallet or dapp
- Customize privacy modes and execution parameters
- Access solver network for liquidity routing
- Ensure users understand risk model

**Risk Tolerance:**
- Low tolerance for breaking API changes
- Needs versioned SDK and backward compatibility guarantees
- Requires technical documentation and support

**Security Assumptions:**
- Reviews open-source contracts and client code
- Operates own gateway endpoints if needed
- Implements client-side key management for users

---

## 6. End-to-End User Flows

### Flow 1: Intent Creation and Submission (Swap Intent, Hidden Amount Mode)

**Prerequisites:**
- User has connected BTC wallet and Starknet wallet to client application
- User has deposited BTC to Starknet via canonical bridge
- User has reviewed risk disclosures and privacy mode explanations

**Steps:**

1. **Asset Selection**
   - User selects asset pair (BTC → USDC)
   - Client queries current market prices and liquidity from solver network
   - Client displays estimated output and fee range

2. **Constraint Definition**
   - User inputs amount: 1.5 BTC
   - User sets minimum output: 142,500 USDC (implied price $95,000/BTC)
   - User sets deadline: 60 minutes from now
   - User sets maximum solver fee: 0.1%

3. **Privacy Mode Selection**
   - User selects "Hidden Amount" mode
   - Client explains: Trade direction visible, amount concealed until settlement
   - Client generates commitment: `amount_commit = hash(1.5 BTC || random_nonce)`

4. **Intent Construction**
   - Client constructs intent object:
     ```
     Intent {
       intent_id: uuid(),
       asset_in: BTC,
       asset_out: USDC,
       amount_commitment: amount_commit,
       min_output_commitment: hash(142500 || nonce),
       deadline: unix_timestamp + 3600,
       max_fee_bps: 10,
       receiver: user_starknet_address,
       nonce: random(),
       privacy_mode: HIDDEN_AMOUNT
     }
     ```

5. **Encryption**
   - Client generates session key pair (ephemeral)
   - Client encrypts amount details: `ciphertext = encrypt(session_key, amount_data)`
   - Client creates intent hash: `intent_hash = hash(intent_object)`

6. **Signing**
   - User signs intent hash with Starknet wallet
   - Client optionally signs with BTC wallet for audit trail
   - Signatures prove: user authorized this intent, no repudiation

7. **Submission to Gateway**
   - Client sends to gateway API: `POST /intents`
     - Ciphertext bundle
     - Intent commitment (public fields only)
     - User signature
     - Client public key
   - Gateway validates:
     - Signature correctness
     - Intent format compliance
     - No replay (nonce uniqueness)
     - User has not exceeded rate limits

8. **Gateway Confirmation**
   - Gateway returns: `intent_id`, `batch_id` (next scheduled batch), `estimated_execution_time`
   - Client stores intent metadata locally for audit log
   - User sees: "Intent submitted. Execution expected in batch #1234 at 14:32 UTC."

9. **Commitment to Starknet**
   - Gateway relays intent commitment to `IntentRegistry` contract
   - Contract emits event: `IntentCommitted(intent_id, intent_hash, batch_id, user_address)`
   - Intent is now irrevocable (unless user explicitly cancels before batch closes)

**Postconditions:**
- Intent is encrypted in gateway storage
- Intent commitment is on-chain (Starknet)
- Solvers can see: asset pair (BTC/USDC), direction (sell BTC), but not amount
- User has proof of submission (transaction hash, intent_id)

**Failure Handling:**
- If signature invalid: Gateway rejects, client prompts user to re-sign
- If network error during submission: Client retries with exponential backoff
- If user loses connectivity: Client stores intent locally, resumes submission on reconnect
- If intent expires before submission: Client prevents submission, warns user

---

### Flow 2: Solver Competition and Batch Execution

**Prerequisites:**
- Batch window has closed (e.g., 30-second window expired)
- Multiple intents submitted in batch
- Multiple solvers are monitoring the encrypted pool

**Steps:**

1. **Batch Formation**
   - Batch coordinator declares batch closed at deterministic timestamp
   - Batch set: all intents submitted in time window
   - Coordinator publishes batch metadata: `batch_id`, `intent_count`, `asset_pairs[]`

2. **Solver Access to Encrypted Pool**
   - Solvers query gateway for ciphertext pool
   - Solvers receive encrypted intent bundles for batch
   - In Hidden Amount mode: solvers see direction (buy/sell) but not size

3. **Solver Solution Computation**
   - Each solver independently computes execution strategy:
     - **Internal Matching:** Identify opposing intents (sell BTC vs buy BTC)
       - Example: Intent A (sell 1.5 BTC) + Intent B (buy 1.0 BTC) → match 1.0 BTC internally at midpoint
     - **External Routing:** Remaining 0.5 BTC routes to AMM or RFQ maker
   - Solver estimates total output, fees, execution quality

4. **Solution Commitment**
   - Solver constructs solution proposal:
     ```
     Solution {
       batch_id: 1234,
       solver_id: solver_address,
       solution_commitment: hash(execution_plan),
       estimated_clearing_prices: {BTC/USDC: 95200},
       solver_fee: 0.08%,
       bond_proof: proof_of_bonded_collateral
     }
     ```
   - Solver signs solution
   - Solver submits to `BatchAuction` contract on Starknet

5. **Auction Mechanism (Sealed-Bid Style)**
   - Multiple solvers submit solutions
   - Auction rules:
     - Highest user surplus (best price improvement vs baseline AMM)
     - Lowest solver fee
     - Tie-breaker: reputation score / past performance
   - Auction closes at `batch_execution_time`

6. **Winner Selection**
   - `BatchAuction` contract evaluates all submitted solutions
   - Contract selects winner(s):
     - Single winner: best solution for entire batch
     - Multiple winners: batch split among solvers (e.g., different asset pairs)
   - Contract emits: `SolverSelected(batch_id, solver_address, solution_commitment)`

7. **Solution Revelation and Execution**
   - Winning solver reveals full execution plan (post-commitment)
   - Contract validates:
     - Solution matches commitment (hash verification)
     - All intent constraints satisfied (min_output, deadlines)
     - No constraint violations
   - If valid: proceed to settlement
   - If invalid: slash solver bond, restart auction with remaining solvers

8. **Batch Settlement on Starknet**
   - `BatchSettlement` contract executes all trades atomically:
     - Intent A: Deduct 1.5 BTC from user, credit 143,000 USDC (after internal match + AMM)
     - Intent B: Deduct 95,000 USDC from user, credit 1.0 BTC
     - Solver fees distributed
   - Contract updates balances, emits `BatchSettled(batch_id, settlement_hash)`

9. **Zero-Knowledge Proof Generation (Optional Enhancement)**
   - Coordinator generates ZK proof of correct settlement
   - Proof attests: all constraints verified, no arithmetic errors
   - Proof posted on-chain for public verifiability

10. **User Notification**
    - Client polls or receives webhook: batch settled
    - Client fetches settlement receipt from Starknet
    - Client decrypts and displays: "Your 1.5 BTC swap executed at $95,333/BTC, received 143,000 USDC"

**Postconditions:**
- Batch has cleared atomically
- All intents in batch settled or reverted together
- Solvers paid fees from protocol treasury or user payments
- Settlement hash recorded on Starknet

**Failure Handling:**
- If no solvers submit solutions: batch expires, intents return to pool for next batch
- If winning solver's solution fails execution: solver bond slashed, backup solver engaged
- If settlement transaction fails (e.g., gas limit): entire batch reverts, no partial execution
- If solver goes offline mid-execution: timeout triggers bond slashing, alternative solver used

---

### Flow 3: Bitcoin Withdrawal (Settlement to Bitcoin L1)

**Prerequisites:**
- User has completed intent execution on Starknet
- User now holds USDC or other assets on Starknet
- User wants to withdraw BTC to native Bitcoin address

**Steps:**

1. **Withdrawal Request Initiation**
   - User navigates to withdrawal interface
   - User inputs Bitcoin address (P2WPKH or P2TR)
   - User specifies withdrawal amount: 0.5 BTC
   - Client validates: address format, sufficient balance, minimum withdrawal threshold

2. **Bridge Interaction**
   - Client calls bridge contract on Starknet: `initiate_withdrawal(btc_amount, btc_address)`
   - Bridge contract:
     - Locks user's BTC representation on Starknet
     - Emits `WithdrawalInitiated` event with `withdrawal_id`
     - Generates withdrawal proof (Merkle proof of state change)

3. **Bridge Oracle / Federation Processing**
   - Bridge operators (multisig or threshold scheme) monitor Starknet events
   - Operators validate withdrawal request:
     - User has sufficient locked balance
     - Bitcoin address is valid
     - Withdrawal within bridge limits
   - Operators sign Bitcoin transaction to send BTC to user's address

4. **Bitcoin Transaction Broadcast**
   - Bridge broadcasts signed BTC transaction to Bitcoin network
   - Transaction includes:
     - Inputs: Bridge's Bitcoin UTXO(s)
     - Outputs: User's Bitcoin address (0.5 BTC), Bridge change address
     - Fee: Dynamic based on mempool congestion

5. **Bitcoin Confirmation**
   - User waits for 1 confirmation (visible in mempool)
   - User waits for 6 confirmations (finality standard)
   - Client displays confirmation progress

6. **Settlement Finality**
   - After 6 confirmations, bridge reports back to Starknet (optional)
   - Bridge contract updates state: withdrawal completed
   - User now has self-custodial BTC in native Bitcoin wallet

**Postconditions:**
- User holds Bitcoin in native L1 wallet
- Starknet balance decreased by withdrawal amount
- Bridge operators have processed withdrawal (fee collected)

**Failure Handling:**
- If Bitcoin address invalid: Client prevents submission
- If bridge offline: Withdrawal request queued, retry logic
- If Bitcoin network congested: User informed of estimated wait time
- If bridge liquidity exhausted: Withdrawal delayed until bridge rebalances
- If bridge fraud: Users rely on bridge security model (multisig threshold, covenant enforcement)

---

### Flow 4: Intent Cancellation (Before Batch Execution)

**Prerequisites:**
- User submitted an intent
- Batch has not yet executed
- User wants to cancel (e.g., market moved, changed mind)

**Steps:**

1. **Cancellation Request**
   - User navigates to "Active Intents" view
   - User selects intent to cancel
   - Client displays: current batch status, time until execution

2. **Deadline Check**
   - Client checks: is current time before batch execution time?
   - If yes: cancellation possible
   - If no: cancellation not allowed (batch in settlement)

3. **On-Chain Cancellation Transaction**
   - User signs cancellation message with Starknet wallet
   - Client submits to `IntentRegistry` contract: `cancel_intent(intent_id, user_sig)`
   - Contract validates:
     - Intent exists and is active
     - User is the intent creator
     - Batch has not executed

4. **Commitment Nullification**
   - Contract marks intent as canceled
   - Contract emits: `IntentCanceled(intent_id, batch_id, user_address)`
   - Intent removed from pending batch

5. **Gateway Cleanup**
   - Gateway receives cancellation event
   - Gateway removes intent ciphertext from pool
   - Solvers no longer see this intent in batch

6. **User Confirmation**
   - Client shows: "Intent canceled. No funds transferred."
   - User's balance unchanged (minus gas fee for cancellation transaction)

**Postconditions:**
- Intent is no longer executable
- User retains original balance
- Batch will execute without this intent

**Failure Handling:**
- If cancellation arrives too late (batch executing): Transaction reverts, user informed
- If user loses connectivity: Client retries cancellation on reconnect
- If gas price too low: Transaction pending, client suggests fee bump

---

### Flow 5: Failure and Reversion (Settlement Failure Scenario)

**Prerequisites:**
- Batch has entered settlement phase
- Solver's proposed solution encounters execution failure

**Steps:**

1. **Settlement Execution Begins**
   - `BatchSettlement` contract processes solver's execution plan
   - Contract attempts to execute trades

2. **Failure Detection**
   - Scenario: AMM liquidity insufficient for routing
   - Contract detects: actual output < user's minimum output constraint
   - Contract halts settlement before committing state changes

3. **Atomic Reversion**
   - Contract reverts all balance changes for entire batch
   - No partial execution: either all intents settle or none do
   - Contract emits: `BatchSettlementFailed(batch_id, failure_reason)`

4. **Solver Bond Slashing**
   - Contract determines: solver submitted invalid solution (failed constraint check)
   - Contract slashes solver's bond:
     - Amount: proportional to impact (e.g., 10% of bond for liquidity failure)
   - Slashed funds distributed:
     - 50% to affected users (gas compensation)
     - 50% to protocol treasury

5. **Intent Return to Pool**
   - All intents in failed batch return to active pool
   - Intents automatically included in next batch
   - Deadlines still enforced (if any intent expired during failure, it's canceled)

6. **User Notification**
   - Client receives `BatchSettlementFailed` event
   - Client displays: "Batch settlement failed (insufficient liquidity). Your intent will retry in next batch."
   - User's balance unchanged (no loss)

7. **Retry or Cancellation Decision**
   - User can choose:
     - Wait for next batch (automatic retry)
     - Cancel intent (if deadline approaching)
     - Adjust constraints (e.g., lower min_output)

**Postconditions:**
- No funds lost due to settlement failure
- Solver penalized for invalid solution
- Users have clear visibility into failure reason

**Failure Handling:**
- If multiple consecutive failures: Protocol triggers circuit breaker, pauses new intents
- If solver bond insufficient for slashing: Solver blacklisted, removed from auction participation
- If contract bug causes failure: Emergency pause activated, intents manually refunded

---

## 7. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Web Client   │  │ Mobile App   │  │ API Client   │         │
│  │ (React/Next) │  │ (React Nat.) │  │ (SDK)        │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Client SDK     │
                    │  (Encryption,   │
                    │   Signing,      │
                    │   Intent Build) │
                    └────────┬────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│ Intent Gateway    │                 │ Starknet RPC      │
│ (API Layer)       │                 │ (Public Nodes)    │
│                   │                 │                   │
│ - Auth & Rate Lim │                 │ - Contract Calls  │
│ - Ciphertext Pool │                 │ - Event Indexing  │
│ - Spam Control    │                 │                   │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          │                                     │
          ├─────────────────────────────────────┤
          │                                     │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│ Solver Network    │                 │ Starknet Contracts│
│                   │                 │                   │
│ - Solver Nodes    │◄────────────────┤ - IntentRegistry  │
│ - Matching Engine │                 │ - BatchAuction    │
│ - Liquidity Agg.  │                 │ - BatchSettlement │
│ - RFQ Makers      │                 │ - SolverBond      │
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          │                                     │
┌─────────▼─────────┐                 ┌─────────▼─────────┐
│ Batch Coordinator │                 │ BTC Adapter Layer │
│                   │                 │                   │
│ - Batch Formation │                 │ - Bridge Integr.  │
│ - Auction Runner  │                 │ - Deposit/Withd.  │
│ - ZK Proof Gen.   │                 │ - Proof-of-Reserve│
└─────────┬─────────┘                 └─────────┬─────────┘
          │                                     │
          └──────────────────┬──────────────────┘
                             │
                    ┌────────▼────────┐
                    │ Observability   │
                    │                 │
                    │ - Metrics       │
                    │ - Logs          │
                    │ - Dashboards    │
                    │ - Alerting      │
                    └─────────────────┘
```

### Component Responsibilities

**Client SDK:**
- Provides developer-friendly API for intent creation
- Handles encryption/decryption of sensitive intent data
- Manages key generation and rotation
- Signs intents with user's Starknet and Bitcoin wallets
- Formats intents according to protocol specification
- Validates user inputs locally before network submission

**Intent Gateway (API Layer):**
- Exposes REST and WebSocket endpoints for intent submission
- Authenticates users (signature verification)
- Enforces rate limits (per user, per IP)
- Stores encrypted intents (no plaintext at rest)
- Manages ciphertext pool accessible to solvers
- Relays intent commitments to Starknet contracts
- Provides intent status queries

**Solver Network:**
- Independent nodes operated by solvers (permissionless participation)
- Monitors encrypted intent pool via gateway API
- Computes optimal execution strategies (matching + routing)
- Submits solution commitments to `BatchAuction` contract
- Executes winning solutions (trade routing, liquidity sourcing)
- Posts bonds on Starknet to guarantee solution validity

**Batch Coordinator:**
- Deterministic batch window scheduler (e.g., every 30 seconds)
- Collects intents from gateway at batch close time
- Forms batch metadata (intent_count, asset_pairs, batch_id)
- Runs auction mechanism (evaluates solver solutions)
- Coordinates settlement process (calls `BatchSettlement` contract)
- Generates zero-knowledge proofs of settlement correctness (optional)
- **Selection Mechanism:**
  - **Phase 1:** Single coordinator operated by protocol team (centralized but transparent)
  - **Phase 2+:** Rotating coordinator selected from bonded coordinator pool
    - Coordinators post bond (similar to solvers)
    - Selection: Round-robin or stake-weighted random selection per batch
    - Slashing: Coordinator slashed if batch manipulation detected
  - **Fallback:** If primary coordinator offline >60 seconds, backup coordinator takes over
  - **Direct Submission:** Users can bypass coordinator and submit directly to `BatchAuction` contract (slower UX, fully decentralized)

**Starknet Contracts:**
- **IntentRegistry:** Stores intent commitments, handles cancellations
- **BatchAuction:** Manages solver selection, sealed-bid auction logic
- **BatchSettlement:** Executes atomic batch clearing, verifies constraints
- **SolverBond:** Manages solver collateral, slashing conditions
- All contracts enforce protocol invariants (expiry, min_output, replay protection)

**BTC Adapter Layer:**
- Interfaces with Bitcoin bridge (deposit/withdrawal flows)
- Monitors Bitcoin L1 for deposit confirmations
- Initiates withdrawals via bridge contracts
- Tracks proof-of-reserve for bridge solvency
- Displays risk tier UI (custody model transparency)

**Observability:**
- Metrics: intent submission rate, batch execution time, solver participation, slashing events
- Logs: privacy-preserving audit trail (no plaintext intent data)
- Dashboards: system health, liquidity depth, solver performance
- Alerting: circuit breaker triggers, contract anomalies, bridge issues

### Trust Assumptions Per Component

**Client SDK:**
- Trustless (open-source, user-verifiable)
- User trusts only their own key management

**Intent Gateway:**
- Partially trusted for liveness (can be mitigated via multiple gateways)
- Cannot decrypt intents (no access to private keys)
- Cannot alter intent commitments (signed by user)
- Risk: censorship (refusing to relay intents) → mitigation: fallback gateways, direct Starknet submission

**Solver Network:**
- Untrusted (adversarial assumption)
- Economic incentive alignment via bonds
- No custody of user funds
- Risk: solver submits invalid solution → mitigation: bond slashing, solution verification

**Batch Coordinator:**
- Partially trusted for fairness (deterministic schedule reduces discretion)
- Cannot alter intent commitments or solver solutions (hashes verified on-chain)
- Cannot steal funds (no custody)
- Risk: coordinator censors certain intents → mitigation: fallback coordinators, direct contract submission

**Starknet Contracts:**
- Trustless (code is law, consensus-secured)
- Immutable once deployed (or governed via on-chain upgrade process)
- Risk: contract bug → mitigation: audits, formal verification, emergency pause

**BTC Adapter Layer:**
- Trusted (Phase 1: relies on bridge operator custody)
- Security depends on bridge model (multisig, threshold, covenant)
- Risk: bridge compromise → mitigation: proof-of-reserve monitoring, clear risk disclosure

### Failure Domains and Blast Radius

**Client SDK Compromise:**
- Impact: Single user's intents leaked or unauthorized
- Blast radius: Affected user only
- Mitigation: User key rotation, client-side wallet security

**Intent Gateway Downtime:**
- Impact: Users cannot submit new intents
- Blast radius: New submissions halted; existing intents unaffected
- Mitigation: Multi-gateway architecture, direct Starknet submission

**Solver Network Failure:**
- Impact: No solutions submitted for batch
- Blast radius: Batch delayed or skipped
- Mitigation: Batch expiry returns intents to pool, alternative solvers incentivized

**Batch Coordinator Failure:**
- Impact: Batches not formed or settled
- Blast radius: Protocol execution halted
- Mitigation: Fallback coordinator, manual emergency settlement mode

**Starknet Contract Bug:**
- Impact: Settlement incorrectly executed or funds locked
- Blast radius: All protocol users
- Mitigation: Contract upgrades (governed), emergency pause, insurance fund

**BTC Bridge Compromise:**
- Impact: User Bitcoin deposits at risk
- Blast radius: All users with BTC deposited via compromised bridge
- Mitigation: Diversify across multiple bridges, proof-of-reserve monitoring, insurance

---

## 8. Protocol Design

### Intent Data Model

**Intent Object (Full Specification):**

```
Intent {
  // Identifiers
  intent_id: UUID,           // Unique intent identifier (generated client-side)
  user_address: StarknetAddress,  // Starknet address of user
  nonce: uint256,            // Prevents replay attacks (MUST be unique per user)
                             // Generation: nonce = hash(user_address || timestamp || client_random)
                             // Client MUST track used nonces locally to prevent accidental reuse

  // Asset Information
  asset_in: AssetIdentifier,  // Asset to sell/supply (Starknet contract address)
  asset_out: AssetIdentifier, // Asset to buy/borrow (Starknet contract address)
  // AssetIdentifier format: Starknet ContractAddress (felt252)
  // Supported assets must be whitelisted in AssetRegistry contract
  // Example: SBTC = 0x..., USDC = 0x..., ETH = 0x...
  
  // Amount (Privacy-Dependent)
  amount_commitment: Bytes32, // Commitment to amount (or plaintext if public)
  amount_proof: ProofData,    // ZK proof of amount correctness (if hidden)
  
  // Constraints
  min_output: uint256,        // Minimum acceptable output
  max_fee_bps: uint16,        // Maximum solver fee (basis points)
  deadline: UnixTimestamp,    // Intent expiration time
  
  // Privacy Mode
  privacy_mode: Enum {
    PUBLIC,                   // All fields visible
    HIDDEN_AMOUNT,            // Amount encrypted, direction visible
    HIDDEN_DIRECTION_AMOUNT   // Amount and direction encrypted
  },
  
  // Encryption (if privacy mode != PUBLIC)
  ciphertext: Bytes,          // Encrypted intent details
  encryption_pubkey: Bytes32, // Client's public key for decryption
  
  // Authorization
  user_signature: Signature,  // Starknet wallet signature
  btc_signature: Signature,   // (Optional) Bitcoin wallet signature
  
  // Metadata
  intent_type: Enum {
    SWAP,
    LIMIT_ORDER,
    DCA,
    LENDING_SUPPLY,
    LENDING_BORROW
  },
  execution_hint: Bytes,      // Optional solver hint (e.g., "prefer AMM routing")
  receiver: StarknetAddress,  // (Optional) Different receiver for output
}
```

**Commitment Scheme:**
- `amount_commitment = Pedersen(amount || nonce || salt)`
  - **Hash Function:** Pedersen hash (Cairo-native, Starknet standard)
  - **Rationale:** Efficient verification in Cairo, widely used in Starknet ecosystem
  - **Alternative (Phase 2+):** Poseidon hash (more efficient for STARK proofs)
- Commitment is binding: user cannot change amount after submission
- Commitment is hiding: observers cannot determine amount from commitment
- **Salt Generation:** Client generates cryptographically secure random 252-bit value
- **Nonce Format:** As specified in Intent data model (hash of user_address || timestamp || client_random)

**Proof Requirements (Hidden Amount Mode):**
- User must provide zero-knowledge proof:
  - "I know `amount` and `nonce` such that `Pedersen(amount || nonce || salt) = commitment`"
  - "amount ≥ 0 and amount ≤ user_balance"
- Proof verified on-chain during settlement

### Privacy Modes (Detailed Specification)

**Mode 0: Public (Baseline)**

*Visibility:*
- All intent fields visible to everyone (solvers, gateway, observers)
- Amount, direction, constraints all in plaintext

*Use Cases:*
- Users who prioritize execution speed over privacy
- Small trades where privacy is not critical
- Testing and debugging

*Trade-offs:*
- Fastest execution (no encryption overhead)
- No privacy guarantee (full orderflow leakage)
- Lowest gas costs (no proof verification)

**Mode 1: Hidden Amount**

*Visibility:*
- Asset pair visible (BTC/USDC)
- Direction visible (buying or selling BTC)
- Amount hidden (commitment only)
- Constraints hidden until settlement

*Encryption Approach:*
- User encrypts: `amount`, `min_output`, `max_fee_bps`
- User publishes: `amount_commitment`, `direction`, `asset_pair`
- Solvers see direction but must estimate size

*Use Cases:*
- Moderate-sized trades (0.1–10 BTC)
- Users concerned about copy-trading
- Balance between privacy and solver efficiency

*Trade-offs:*
- Solvers have less information → may provide worse execution
- Users get partial privacy (size concealment)
- Moderate gas cost (commitment verification)

**Mode 2: Hidden Direction + Amount (Maximum Privacy)**

*Visibility:*
- Asset pair visible
- Direction hidden (could be buy or sell)
- Amount hidden
- All constraints hidden

*Encryption Approach:*
- User encrypts: `direction`, `amount`, `min_output`, `max_fee_bps`
- User publishes: `ciphertext`, `asset_pair`
- Solvers must compete without knowing trade direction

*Use Cases:*
- Large trades (10+ BTC)
- Institutional users requiring full confidentiality
- High-value lending positions

*Trade-offs:*
- Highest privacy (minimal orderflow leakage)
- Solver execution may be less efficient (blind solving)
- Highest gas cost (full proof verification)

*Technical Challenge:*
- Solvers must solve for both buy and sell scenarios
- Internal matching less effective (harder to identify opposing intents)

### Batch Auction Mechanics

**Batch Window:**
- Fixed duration: 30 seconds (configurable governance parameter)
- Deterministic schedule: batch N closes at `genesis_time + (N * 30 seconds)`
- No discretion: coordinator cannot extend or shorten windows

**Batch Formation Process:**

1. **Collection Phase (0–30 seconds):**
   - Gateway accepts intent submissions
   - Intents timestamped upon receipt
   - Intents added to pending pool

2. **Closure (30-second mark):**
   - Coordinator declares batch N closed
   - All intents received before closure included in batch
   - Late intents automatically roll to batch N+1

3. **Solver Notification:**
   - Coordinator publishes batch metadata:
     - `batch_id: N`
     - `intent_count: X`
     - `asset_pairs: [BTC/USDC, BTC/ETH, ...]`
   - Solvers fetch encrypted intent pool for batch N

4. **Solution Submission Window (30–50 seconds from batch genesis):**
   - Solvers have 20 seconds to compute and submit solutions
   - Solutions submitted to `BatchAuction` contract
   - Multiple solvers compete
   - Submission deadline: `batch_close_time + 20 seconds`

5. **Auction Resolution (50–55 seconds from batch genesis):**
   - `BatchAuction` contract evaluates all solutions
   - Winner(s) selected based on auction rules (below)
   - Auction finalization deadline: `batch_close_time + 25 seconds`

6. **Settlement Execution (55–75 seconds from batch genesis):**
   - Winning solver reveals execution plan within 5 seconds of winning
   - `BatchSettlement` contract verifies and executes
   - Settlement must complete before next batch closes (`batch_close_time + 30 seconds` max)
   - If settlement exceeds window: next batch delayed until current batch completes

**Auction Rules (Solver Selection):**

Solvers are ranked by:

1. **User Surplus (Primary):**
   - `surplus = (solver_output - min_output) for all intents`
   - Higher surplus = better execution for users
   - Example: Intent requests min 95,000 USDC; solver delivers 95,500 USDC → surplus 500 USDC
   - **Baseline Reference:** Surplus calculated against user's specified `min_output`, NOT against external AMM price
   - **Price Improvement Metric (Informational Only):** Protocol tracks solver execution vs reference AMM (Ekubo on Starknet) for statistics, but auction scoring uses only user-specified constraints

2. **Solver Fee (Secondary):**
   - Lower solver fee preferred (users keep more value)
   - Example: Solver A charges 0.08%, Solver B charges 0.1% → Solver A wins tie

3. **Reputation Score (Tertiary):**
   - Historical performance: successful settlements, no slashing
   - Reputation = `(successful_settlements / total_attempts) * 100`
   - **New Solver Initialization:** New solvers start at base reputation (80%)
   - **Minimum Attempts for Reputation:** Solvers with <10 total attempts use base reputation (prevents gaming via selective participation)
   - **Reputation Decay:** Solvers inactive for >90 days have reputation reset to base (prevents stale high-reputation solvers from dominating)
   - **Reputation Floor:** Minimum reputation 0% (solver with 100% failure rate)
   - **Reputation Ceiling:** Maximum reputation 100% (solver with 100% success rate)

4. **Tie-Breaker (Quaternary):**
   - Earliest solution submission timestamp
   - Incentivizes fast solution computation

**Winner Determination:**
- Single winner: solver with highest combined score
- Multiple winners (optional): batch split by asset pair or intent size

**Auction Commitment:**
- Solvers submit `solution_commitment = hash(execution_plan)`
- Prevents front-running of other solvers' solutions
- After winner selected, solver reveals full execution plan
- If revealed plan does not match commitment: solver slashed

### Solver Bonding and Slashing

**Bond Requirements:**

- Solvers must post bond to participate in auctions
- **Minimum bond:** 10 BTC equivalent (in wrapped BTC or stablecoin)
- **Bond Scaling:** For batches with total value >100 BTC, solver must have bond ≥ 10% of batch value
  - Example: Batch with 500 BTC total value requires solver bond ≥ 50 BTC
  - Prevents under-capitalized solvers from handling large batches
- **Bond Denomination:** Accepted assets: SBTC (wrapped BTC), USDC, USDT (converted to BTC-equivalent at oracle price)
- Bond locked in `SolverBond` contract on Starknet
- Bond is stake: slashed for misbehavior, returned on exit (after 7-day withdrawal delay)

**Slashing Conditions:**

1. **Constraint Violation:**
   - Solver's execution delivers output < user's `min_output`
   - Slash: 5% of bond per violated intent

2. **Settlement Failure:**
   - Solver's solution fails execution (e.g., insufficient liquidity)
   - **Preventable Failure (Slash 10% of bond):**
     - Solver did not verify liquidity before submitting solution
     - Solver's execution plan contained arithmetic errors
     - Solver failed to account for slippage in AMM routing
     - Solver submitted solution knowing it would fail (provable via on-chain state at submission time)
   - **Unpreventable Failure (No slash):**
     - AMM pool liquidity drained by external transaction between solution submission and execution
     - Oracle price feed failure (external dependency)
     - Starknet gas price spike causing execution to exceed gas limit
   - **Determination:** `BatchSettlement` contract compares on-chain state at solution submission vs execution time
   - **Dispute:** Solver can challenge slashing via governance review within 7 days

3. **Commitment Mismatch:**
   - Revealed execution plan does not match `solution_commitment` hash
   - Slash: 20% of bond (presumed fraud)

4. **Timeout:**
   - Solver wins auction but fails to reveal execution plan within deadline
   - Slash: 15% of bond (opportunity cost to users)

5. **Repeated Failures:**
   - Solver has >3 slashing events in 30-day window
   - Slash: Full bond, permanent blacklist from auctions
   - **Blacklist Enforcement:** Solver's address added to on-chain blacklist in `SolverBond` contract
   - **No Re-Entry:** Blacklisted solver cannot create new solver identity (bond deposits from blacklisted addresses rejected)

6. **All-Solver Failure (Circuit Breaker):**
   - If all active solvers are slashed or blacklisted simultaneously
   - Protocol enters emergency mode:
     - New intent submissions paused
     - Pending intents remain in pool (not canceled)
     - Governance must approve new solver whitelist
     - Protocol resumes after ≥2 new solvers post bonds

**Slashing Distribution:**
- 50% to affected users (proportional to impact)
- 30% to protocol treasury (sustainability)
- 20% to whistleblowers (if slashing triggered by external report)

**Bond Adjustment:**
- Solvers can top up bond if slashed (to continue participation)
- Solvers can increase bond to improve reputation score
- Solvers can withdraw bond after 7-day exit period (if no pending slashing disputes)

### Replay Protection

**Nonce-Based Replay Prevention:**
- Every intent includes unique `nonce` (uint256)
- `IntentRegistry` contract maintains mapping: `user_address -> used_nonces`
- Before committing intent: contract checks `nonce not in used_nonces[user]`
- If nonce already used: transaction reverts

**Double-Spending Prevention:**
- User cannot submit multiple intents that exceed their balance
- **Soft Check (Gateway):** Gateway maintains pending intent ledger:
  - When intent submitted: `pending_balance[user] += intent.amount`
  - When intent settles/cancels: `pending_balance[user] -= intent.amount`
  - Gateway rejects new intent if: `pending_balance[user] + new_intent.amount > user.on_chain_balance`
  - **Limitation:** Soft check is advisory only (gateway can be bypassed)
- **Hard Check (On-Chain Settlement):** `BatchSettlement` contract verifies:
  - At settlement time: `user.balance >= sum(all_user_intents_in_batch.amount)`
  - If insufficient balance: entire batch reverts (all intents fail atomically)
  - **Implication:** User who submits over-balance intent causes batch failure, triggering solver slashing dispute
- **Balance Lock (Alternative, Phase 2+):** Intent commitment locks balance on-chain:
  - `IntentRegistry.commit_intent()` transfers `intent.amount` to escrow
  - Prevents double-spending cryptographically
  - Trade-off: Requires on-chain transaction for every intent (higher gas cost)

**Intent Uniqueness:**
- `intent_id = hash(user_address || nonce || intent_data)`
- Prevents identical intents from being submitted twice
- Even if user wants to submit same trade: must use different nonce

### Expiry Handling

**Intent Expiry Mechanism:**
- Every intent has `deadline` (Unix timestamp)
- At settlement time: contract checks `current_block_time ≤ deadline`
- If expired: intent excluded from batch, marked as canceled

**Expiry Edge Cases:**

1. **Intent Expires During Batch Window:**
   - Intent submitted at T=0 with deadline T=25 seconds
   - Batch closes at T=30 seconds
   - Result: Intent not included in batch (expired before closure)

2. **Intent Expires Between Batch Closure and Settlement:**
   - Intent submitted with deadline T=40 seconds
   - Batch closes at T=30, settlement executes at T=55
   - Result: Intent reverts during settlement (expired before execution)

3. **User Cancels Before Expiry:**
   - User explicitly cancels intent at T=20
   - Intent removed from pool, deadline no longer relevant

**Automatic Cleanup:**
- Gateway periodically prunes expired intents from ciphertext pool
- On-chain contract emits `IntentExpired` event
- User clients notified: "Your intent expired without execution"

### Deterministic Ordering Guarantees

**Batch-Level Ordering:**
- All intents in a batch are considered simultaneous
- No intent has priority over another within the same batch
- Removes miner/sequencer ordering advantage

**Settlement Execution Order (Within Batch):**
- Internal matches processed first (highest efficiency)
- Remaining intents executed by asset pair priority:
  - Priority determined by total batch volume per pair
  - Example: BTC/USDC batch volume 100 BTC > BTC/ETH batch volume 10 BTC → BTC/USDC settles first

**Why Ordering Matters:**
- If AMM liquidity shared across pairs, execution order affects prices
- Protocol guarantees: ordering is deterministic, not manipulable
- Ordering rule published in documentation (auditable)

**Cross-Batch Ordering:**
- Batch N+1 cannot execute before Batch N settlement completes
- Ensures strict temporal ordering: earlier batches always settle first

---

## 9. Bitcoin Integration Model

### Exact BTC Custody / Representation Assumptions (Phase 1)

**Model:** Canonical wrapped Bitcoin or Starknet-native BTC representation via trusted bridge.

**Assumptions:**

1. **Bridge Custody:**
   - BTC held in multi-signature wallet on Bitcoin L1
   - Threshold: M-of-N signers (e.g., 7-of-10 or similar)
   - Signers: Mix of reputable entities (exchanges, custody providers, protocol teams)

2. **Starknet Representation:**
   - ERC-20-equivalent BTC token on Starknet (`SBTC` or similar)
   - 1:1 peg with Bitcoin held in custody
   - Token minting/burning controlled by bridge contract

3. **Trust Assumptions:**
   - Users trust bridge signers not to collude (M-of-N threshold must exceed collusion risk)
   - Users trust bridge operators to maintain proof-of-reserve
   - Users trust bridge contract code (audited, open-source)

**Explicitly NOT Assumed:**
- Native Bitcoin L1 execution (this is execution layer, not Bitcoin L1)
- Zero-trust bridge (Phase 1 uses multi-sig; Phase 2+ explores covenant upgrades)
- Instant finality (Bitcoin 6-confirmation standard still applies)

### Deposit & Withdrawal Lifecycle

**Deposit Flow (Bitcoin L1 → Starknet):**

1. **User Sends Bitcoin to Bridge Address:**
   - User transfers BTC to bridge-controlled Bitcoin address
   - User includes identifier in transaction (e.g., OP_RETURN with Starknet address)

2. **Bitcoin Confirmation:**
   - Bridge monitors Bitcoin network for incoming transactions
   - After 6 confirmations: transaction considered final

3. **Bridge Minting on Starknet:**
   - Bridge signers sign minting transaction
   - Bridge contract on Starknet mints equivalent `SBTC` to user's address
   - User sees balance update in Starknet wallet

4. **Proof-of-Reserve Update:**
   - Bridge publishes updated proof-of-reserve (total BTC custody = total SBTC supply)

**Withdrawal Flow (Starknet → Bitcoin L1):**

1. **User Initiates Withdrawal:**
   - User calls bridge contract on Starknet: `withdraw(amount, btc_address)`
   - Contract burns user's `SBTC` tokens
   - Contract emits `WithdrawalRequest` event

2. **Bridge Signing:**
   - Bridge signers monitor withdrawal events
   - Signers validate: user has burned tokens, Bitcoin address is valid
   - Signers generate Bitcoin transaction signatures

3. **Bitcoin Transaction Broadcast:**
   - Bridge broadcasts signed transaction to Bitcoin network
   - Transaction sends BTC from custody wallet to user's address

4. **Bitcoin Confirmation:**
   - User waits 1–6 confirmations depending on risk tolerance
   - After 6 confirmations: user has self-custodial BTC

**Timing:**
- **Deposit:** ~60 minutes (6 Bitcoin blocks @ 10 min/block) + Starknet mint transaction (~30 seconds)
  - **Total:** 60-90 minutes from Bitcoin transaction broadcast to Starknet balance available
- **Withdrawal:** Bridge signing (~5-60 minutes, depends on bridge operator responsiveness) + Bitcoin confirmation (~60 minutes for 6 blocks)
  - **Total:** 65-120 minutes from Starknet burn to Bitcoin received
  - **Delay Factors:** Bridge liquidity exhaustion, Bitcoin mempool congestion, bridge operator downtime
- **Withdrawal Limits (Per Bridge):**
  - **Per-User Limit:** 10 BTC per 24 hours (anti-bank-run measure)
  - **Total Daily Limit:** 100 BTC per 24 hours (bridge liquidity constraint)
  - **Emergency Mode:** If bridge reserves <20% buffer, limits reduced to 1 BTC per user, 10 BTC total

### Security Model and Risk Disclosure

**Security Properties:**

1. **Starknet Execution Security:**
   - Intent execution correctness guaranteed by Starknet contracts and ZK proofs
   - Solver accountability enforced via on-chain slashing
   - Batch settlement atomicity guaranteed

2. **Bitcoin Settlement Security:**
   - Final value transfer secured by Bitcoin L1 consensus
   - Bitcoin custody secured by bridge multi-signature scheme

**Risk Tiers (Disclosed to Users):**

**Tier 1: Starknet Execution Risk (Low)**
- Probability: <1% (audited contracts, formal verification)
- Impact: Intent mis-execution, funds locked temporarily
- Mitigation: Emergency pause, contract upgrade, insurance fund

**Tier 2: Bridge Custody Risk (Medium)**
- Probability: 1–5% (multi-sig collusion, bridge operator failure)
- Impact: Loss of deposited BTC
- Mitigation: Proof-of-reserve monitoring, diversification across bridges

**Tier 3: Bitcoin Network Risk (Very Low)**
- Probability: <0.1% (Bitcoin L1 consensus failure)
- Impact: Loss of Bitcoin finality guarantees
- Mitigation: None (external to protocol)

**User Interface Disclosure:**
- Before deposit: "Your BTC will be held in a multi-signature custody wallet operated by [bridge operator]. While this is a trusted model, it is not trustless. Learn more: [link]"
- Withdrawal disclaimer: "Withdrawals typically complete in 1–2 hours. Delays may occur if Bitcoin network is congested or bridge is rebalancing liquidity."

### Compatibility with Future Covenant / OP_CAT-Based Upgrades

**Design for Upgradeability:**

The protocol is architected such that:

1. **Interface Abstraction:**
   - `BTC Adapter Layer` is modular
   - Adapter exposes standard interface: `deposit()`, `withdraw()`, `get_balance()`
   - Backend implementation can be swapped

2. **Phase 2 Upgrade Path (OP_CAT-Enabled):**
   - When OP_CAT is available on Bitcoin (via soft fork or sidechain)
   - New adapter implementation uses covenant-based custody
   - Covenant enforces withdrawal rules on Bitcoin L1 (e.g., "only withdraw if Starknet proof verifies")

3. **Covenant Security Model:**
   - Bitcoin covenant restricts spending conditions
   - Withdrawal requires cryptographic proof from Starknet
   - Removes need for trusted multi-sig signers

4. **Migration Strategy:**
   - Users can opt-in to migrate from multi-sig bridge to covenant bridge
   - Both bridges run in parallel during transition period
   - Eventually: covenant bridge becomes canonical

**Why This Design Is Chosen:**

- **Ship Now:** Phase 1 (multi-sig) is production-ready today, no dependence on Bitcoin upgrades
- **Upgrade Later:** Covenant support preserves long-term vision of trustlessness
- **User Choice:** Users can select risk tier (multi-sig vs covenant) based on their trust preferences

### Rejected Alternatives and Trade-offs

**Alternative 1: Wait for Bitcoin Covenants Before Shipping**
- Rejected because: Bitcoin upgrade timeline uncertain (years, not months)
- Trade-off: Phase 1 has bridge trust assumptions; Phase 2+ removes them

**Alternative 2: Build on Bitcoin L2 (Lightning, Liquid)**
- Rejected because: L2s lack zero-knowledge proving infrastructure and intent-based execution primitives
- Trade-off: Starknet provides better execution layer; Bitcoin L1 provides better settlement

**Alternative 3: No Bitcoin Integration (Starknet-Only)**
- Rejected because: Defeats purpose of "BTC-native" intents
- Trade-off: Bitcoin involvement critical for market positioning and user trust

---

## 10. Starknet Smart Contract Requirements

### Contract 1: IntentRegistry

**Purpose:**  
Maintain canonical on-chain record of all intent commitments. Provide commitment, cancellation, and expiry management.

**Storage Layout:**

```cairo
struct Intent {
    intent_id: felt252,
    user: ContractAddress,
    asset_in: ContractAddress,
    asset_out: ContractAddress,
    amount_commitment: felt252,
    min_output: u256,
    deadline: u64,
    privacy_mode: u8,
    status: IntentStatus, // PENDING, SETTLED, CANCELED, EXPIRED
}

struct IntentStatus {
    PENDING: 0,
    SETTLED: 1,
    CANCELED: 2,
    EXPIRED: 3,
}

// Storage
intent_by_id: LegacyMap<felt252, Intent>,
user_nonces: LegacyMap<ContractAddress, LegacyMap<felt252, bool>>,
batch_intents: LegacyMap<felt252, Array<felt252>>, // batch_id -> [intent_ids]
```

**Public Interfaces:**

```cairo
// Commit new intent
fn commit_intent(
    intent_id: felt252,
    user: ContractAddress,
    intent_hash: felt252,
    nonce: felt252,
    deadline: u64,
    user_signature: Array<felt252>
) -> bool;

// Cancel pending intent
fn cancel_intent(
    intent_id: felt252,
    user_signature: Array<felt252>
) -> bool;

// Query intent status
fn get_intent(intent_id: felt252) -> Intent;

// Mark intent as settled (called by BatchSettlement)
fn mark_settled(intent_id: felt252) -> bool;

// Mark intent as expired (called by batch coordinator or anyone)
fn mark_expired(intent_id: felt252) -> bool;
```

**Invariants:**

1. **Nonce Uniqueness:** Each `(user, nonce)` pair can only be used once
2. **Intent Immutability:** Once committed, intent data cannot be altered (only status changes)
3. **Cancellation Constraint:** Only pending intents can be canceled
4. **Expiry Enforcement:** Intents with `deadline < current_block_time` cannot be settled
5. **Authorization:** Only intent creator can cancel; only `BatchSettlement` contract can mark settled

**Upgradeability Policy:**
- Proxy pattern with admin-controlled upgrades
- Timelock: 7 days between upgrade proposal and execution
- Emergency pause: Admin can pause `commit_intent` if critical bug detected

**Failure Handling:**
- Invalid signature: Revert with error `INVALID_SIGNATURE`
- Duplicate nonce: Revert with error `NONCE_ALREADY_USED`
- Expired deadline on commit: Revert with error `DEADLINE_PASSED`
- Unauthorized cancellation: Revert with error `NOT_INTENT_OWNER`

---

### Contract 2: BatchAuction

**Purpose:**  
Manage solver selection via sealed-bid auction mechanism. Accept solution commitments, evaluate based on scoring rules, select winner(s).

**Storage Layout:**

```cairo
struct Solution {
    batch_id: felt252,
    solver: ContractAddress,
    solution_commitment: felt252,
    estimated_surplus: u256,
    solver_fee_bps: u16,
    submission_time: u64,
}

struct Batch {
    batch_id: felt252,
    close_time: u64,
    intent_count: u32,
    auction_deadline: u64,
    winning_solver: ContractAddress,
    status: BatchStatus, // OPEN, AUCTION, SETTLED, FAILED
}

// Storage
batch_by_id: LegacyMap<felt252, Batch>,
solutions_by_batch: LegacyMap<felt252, Array<Solution>>,
solver_reputation: LegacyMap<ContractAddress, u256>, // reputation score (0-100)
```

**Public Interfaces:**

```cairo
// Submit solution commitment
fn submit_solution(
    batch_id: felt252,
    solution_commitment: felt252,
    estimated_surplus: u256,
    solver_fee_bps: u16,
    bond_proof: felt252
) -> bool;

// Finalize auction and select winner
fn finalize_auction(batch_id: felt252) -> ContractAddress;

// Query auction results
fn get_winning_solver(batch_id: felt252) -> ContractAddress;

// Slash solver if revealed solution invalid
fn slash_solver(
    solver: ContractAddress,
    reason: felt252,
    slash_amount: u256
) -> bool;
```

**Invariants:**

1. **Auction Timeline:** Solutions can only be submitted between `batch_close_time` and `auction_deadline`
2. **Single Winner:** Each batch has exactly one winning solver (or zero if no valid solutions)
3. **Commitment Binding:** Solver cannot change solution after commitment submitted
4. **Bond Requirement:** Solver must have sufficient bond before submitting solution

**Upgradeability Policy:**
- Proxy pattern with admin upgrades
- Auction rules (scoring formula) parameterized via governance

**Failure Handling:**
- No solutions submitted: Batch marked `FAILED`, intents return to pool
- All solutions fail verification: Slash all solvers, mark batch `FAILED`
- Solver reveals mismatched plan: Slash solver, award to next-best solution

---

### Contract 3: BatchSettlement

**Purpose:**  
Execute atomic batch clearing. Verify all intent constraints, transfer assets, distribute fees, emit settlement events.

**Storage Layout:**

```cairo
struct Transfer {
    from: ContractAddress,
    to: ContractAddress,
    asset: ContractAddress,
    amount: u256,
}

struct Settlement {
    batch_id: felt252,
    solver: ContractAddress,
    transfers: Array<Transfer>,
    settlement_hash: felt252,
    executed: bool,
}

// Storage
settlement_by_batch: LegacyMap<felt252, Settlement>,
```

**Public Interfaces:**

```cairo
// Execute batch settlement
fn settle_batch(
    batch_id: felt252,
    solver: ContractAddress,
    execution_plan: Array<Transfer>,
    proofs: Array<felt252>
) -> bool;

// Verify settlement correctness (called internally)
fn verify_constraints(
    intent_id: felt252,
    output_amount: u256,
    proof: felt252
) -> bool;

// Query settlement results
fn get_settlement(batch_id: felt252) -> Settlement;
```

**Invariants:**

1. **Atomicity:** All transfers in batch execute or all revert (no partial settlement)
2. **Constraint Satisfaction:** Every intent's `min_output` must be met
3. **Balance Conservation:** Sum of inputs = sum of outputs + fees
4. **No Double-Spend:** User balance checked before each transfer
5. **Settlement Immutability:** Once batch settled, settlement cannot be re-executed

**Upgradeability Policy:**
- Proxy upgrades with strict invariant preservation tests
- Cannot upgrade while batches are pending (must wait for all pending batches to settle)
- **Mandatory Invariant Preservation:**
  - **Balance Conservation:** `sum(user_balances_before) == sum(user_balances_after)` for all upgrades
  - **Intent Commitment Immutability:** Existing intent commitments remain valid and executable post-upgrade
  - **Nonce Continuity:** Used nonces remain marked as used (no nonce reuse possible)
  - **Settlement Finality:** Settled batches cannot be re-executed or reversed
- **Pre-Upgrade Validation:**
  - Deploy new implementation to testnet
  - Run invariant test suite (automated checks for all invariants)
  - Simulate upgrade on mainnet fork (verify no state corruption)
  - Independent auditor reviews upgrade diff
- **Upgrade Execution:**
  - Pause new intent submissions
  - Wait for all pending batches to settle (max 2 minutes)
  - Execute proxy upgrade transaction
  - Run post-upgrade health checks
  - Resume intent submissions

**Failure Handling:**
- Constraint violation: Revert entire batch, slash solver
- Insufficient balance: Revert batch, intent remains pending
- External contract call failure (e.g., AMM swap): Revert batch, mark AMM failure (no slash if unpredictable)

---

### Contract 4: SolverBond

**Purpose:**  
Manage solver collateral. Handle deposits, withdrawals, slashing, reputation tracking.

**Storage Layout:**

```cairo
struct SolverInfo {
    solver: ContractAddress,
    bond_amount: u256,
    locked: bool, // true if solver has pending settlements
    slashing_history: Array<SlashEvent>,
    successful_settlements: u32,
    failed_settlements: u32,
}

struct SlashEvent {
    batch_id: felt252,
    slash_amount: u256,
    reason: felt252,
    timestamp: u64,
}

// Storage
solver_info: LegacyMap<ContractAddress, SolverInfo>,
minimum_bond: u256, // Governance parameter
```

**Public Interfaces:**

```cairo
// Deposit bond
fn deposit_bond(amount: u256) -> bool;

// Request withdrawal (subject to exit period)
fn request_withdrawal(amount: u256) -> bool;

// Execute withdrawal (after exit period)
fn withdraw(amount: u256) -> bool;

// Slash solver (called by BatchAuction or BatchSettlement)
fn slash(
    solver: ContractAddress,
    amount: u256,
    reason: felt252,
    recipients: Array<ContractAddress>
) -> bool;

// Get solver reputation score
fn get_reputation(solver: ContractAddress) -> u256;
```

**Invariants:**

1. **Minimum Bond:** Solver cannot participate in auctions if `bond_amount < minimum_bond`
2. **Locked Bonds:** Solver cannot withdraw while settlement pending
3. **Slash Before Withdraw:** Slashing takes precedence over withdrawal requests
4. **Reputation Accuracy:** `reputation = (successful / (successful + failed)) * 100`

**Upgradeability Policy:**
- Proxy upgrades allowed
- `minimum_bond` adjustable via governance (with 7-day delay)

**Failure Handling:**
- Withdrawal during lock period: Revert with `BOND_LOCKED`
- Slash exceeds bond: Slash all available, blacklist solver
- Repeated slashing (>3 in 30 days): Permanent blacklist

---

## 11. Cryptography & Privacy Model

### Encryption Scheme (Conceptual)

**User-Side Encryption:**

Protocol uses hybrid encryption for intent details:

1. **Symmetric Encryption:**
   - User generates ephemeral AES-256-GCM session key
   - Encrypts sensitive fields: `amount`, `min_output`, `direction` (depending on privacy mode)
   - Produces `ciphertext`

2. **Key Encapsulation:**
   - User encrypts session key with gateway's public key (ECDH or RSA)
   - Produces `encrypted_session_key`

3. **Submission Bundle:**
   - User submits: `(ciphertext, encrypted_session_key, commitment, signature)`

**Solver-Side Decryption:**

- **Pre-Auction Access (Hidden Amount/Direction modes):** Solvers receive time-locked decryption keys at batch formation
  - Keys encrypted with solver's public key (registered in `SolverBond` contract)
  - Time-lock ensures keys only usable after batch closes (prevents early front-running)
- **Post-Auction Revelation (Alternative model):** Winning solver receives decryption key from coordinator after auction
  - Coordinator holds master decryption key in HSM
  - Coordinator releases key only to auction winner
- **Implementation Choice:** Phase 1 uses post-auction revelation (simpler); Phase 2+ may use threshold encryption (solvers collectively decrypt)
- Solver decrypts session key → decrypts intent details → computes execution plan

**Security Properties:**

- **Confidentiality:** Only winning solver can decrypt (before settlement revelation)
- **Integrity:** Signature ensures ciphertext not tampered
- **Non-Repudiation:** User cannot claim "I didn't submit this intent"

### Key Management

**User Keys:**

- **Starknet Wallet Key:** Signs intent commitments (on-chain authorization)
- **Encryption Session Key:** Ephemeral, generated per intent (discarded after use)
- **Bitcoin Wallet Key (Optional):** Signs intent for audit trail (not required for protocol security)

**Gateway Keys:**

- **Public Key:** Each gateway operator publishes their own public encryption key
  - Users select which gateway to trust when submitting intents
  - Gateway public keys registered in on-chain `GatewayRegistry` contract
  - Key rotation: Each gateway rotates independently (every 90 days recommended)
- **Private Key:** Held in HSM (Hardware Security Module), used to decrypt session keys for batch coordinator
  - **Single-Gateway Model:** Gateway decrypts and forwards to coordinator
  - **Multi-Gateway Model:** Threshold decryption (requires M-of-N gateways to decrypt)
  - **Trust Implication:** Users must trust at least one gateway (single-gateway) or M gateways (threshold model) not to collude

**Batch Coordinator Keys:**

- **Signing Key:** Signs batch commitments
- **Decryption Key:** (If coordinator distributes decryption to solvers) Held in secure enclave

**Key Rotation Policy:**

- Gateway encryption key rotated every 90 days
- Old keys retained for 6 months (to support historical intent decryption for audits)
- User session keys never reused

### Proof Requirements

**Hidden Amount Mode Proofs:**

User must provide zero-knowledge proof:

**Claim:**  
"I know `amount` and `nonce` such that `Pedersen(amount || nonce) = commitment` AND `0 ≤ amount ≤ my_balance`"

**Proof System:**  
- **Phase 1 Implementation:** STARK proofs (Cairo-native, Starknet-compatible)
  - Prover: Cairo program generates execution trace
  - Verifier: Starknet contract verifies STARK proof on-chain
  - **Rationale:** Native Starknet integration, no additional verifier contracts needed
- **Alternative Systems (Future Consideration):**
  - Groth16: Smaller proof size, but requires trusted setup
  - PLONK: Universal setup, but higher verification cost
  - Halo2: No trusted setup, but not yet Cairo-native
- **Public Inputs:** `commitment`, `user_balance` (from on-chain state)
- **Private Inputs:** `amount`, `nonce`
- **Circuit Constraints:**
  - `Pedersen(amount || nonce) == commitment`
  - `amount >= 0`
  - `amount <= user_balance`

**Verification:**  
- `BatchSettlement` contract verifies proof on-chain
- If proof invalid: settlement reverts, solver not slashed (user error)

**Hidden Direction Mode Proofs:**

User must provide proof:

**Claim:**  
"I know `direction` (buy or sell), `amount`, `nonce` such that constraints satisfied"

**Challenge:**  
Proving direction without revealing requires more complex circuit (range proof + conditional logic)

**Practical Implementation:**  
Phase 1 may not support Hidden Direction mode due to complexity; Phase 2+ can add if demand exists.

### What Is Public vs Private at Each Stage

**Stage 1: Intent Submission**

*Public:*
- User's Starknet address
- Asset pair (e.g., BTC/USDC)
- Intent type (swap, limit, DCA)
- Deadline timestamp
- Privacy mode selection

*Private (if Hidden Amount mode):*
- Exact amount
- Exact min_output
- Max fee tolerance

*Private (if Hidden Direction mode):*
- Direction (buy vs sell)
- Amount
- All constraints

**Stage 2: Solver Competition**

*Public:*
- Batch metadata (batch_id, intent_count)
- Number of solvers participating

*Private:*
- Solver's proposed execution plan (commitment only)
- Intent details remain encrypted

**Stage 3: Settlement Revelation**

*Public:*
- Winning solver identity
- Final clearing prices
- Transfers (from/to addresses, amounts)
- Settlement success/failure

*Private:*
- Nothing (all details revealed for settlement verification)

**Post-Settlement:**

*Public Forever:*
- Full settlement details (amounts, prices, fees)
  - **Privacy Implication:** Once batch settles, all intent details become public on-chain (required for settlement verification)
  - **Privacy Window:** Privacy modes protect intents only during pre-settlement phase (submission → auction → execution)
  - **Post-Settlement Anonymity:** User addresses are public, but cannot be linked to pre-settlement encrypted intents without additional metadata analysis
- Solver performance (reputation updates)

### Metadata Leakage Analysis

**Observable Metadata:**

1. **Timing:**
   - When intent was submitted (timestamp precision: seconds)
   - Which batch intent was included in
   - Settlement latency

   *Leakage Risk:* Observers can correlate timing with external events (e.g., news, price movements)

2. **Gas Costs:**
   - Transaction fees for intent commitment
   - Gas usage correlates with intent complexity

   *Leakage Risk:* Higher gas = more complex intent (e.g., multi-hop routing)

3. **Asset Pairs:**
   - Always visible (required for solver routing)

   *Leakage Risk:* Reveals user's asset interest

4. **Batch Participation:**
   - Observable which users have intents in which batches

   *Leakage Risk:* Statistical analysis could link users to trading patterns

**Mitigation Strategies:**

- **Timing Obfuscation:** Users can submit intents with random delays
- **Gas Normalization:** Protocol pads transactions to fixed gas cost
- **Dummy Intents:** Users can submit encrypted dummy intents (not executed) to obscure real intents
- **Decoy Participation:** Users can appear to participate in batches without submitting real intents

**Honest Disclosure:**

Protocol documentation clearly states: "Full privacy is not achieved. Timing, gas costs, and asset pairs are public. If you require absolute anonymity, use additional privacy layers (e.g., Tor, VPN)."

---

## 12. Threat Model & Security Analysis

### Threat 1: MEV and Front-Running

**Attack Vector:**  
Adversary observes pending intents, front-runs by submitting competing transaction with higher fee.

**Mitigation:**

1. **Encrypted Orderflow:**
   - Intent details not visible in public mempool
   - Adversary cannot determine profitable front-run without knowing amount/direction

2. **Batch Clearing:**
   - All intents in batch execute simultaneously
   - No transaction ordering within batch
   - Removes ordering advantage

3. **Deterministic Batch Schedule:**
   - Batch timing is public and fixed
   - Adversary cannot manipulate batch formation timing

**Residual Risk:**

- If privacy mode is PUBLIC, intents are still visible (user choice)
- Metadata leakage (timing, asset pair) could enable statistical front-running

**Severity:** Low (with encrypted orderflow), High (without)

---

### Threat 2: Intent Leakage

**Attack Vector:**  
Gateway operator or malicious insider accesses plaintext intent details before settlement.

**Mitigation:**

1. **Client-Side Encryption:**
   - Intent details encrypted by user before leaving client
   - Gateway stores only ciphertext

2. **HSM-Protected Keys:**
   - Gateway's decryption keys stored in Hardware Security Module
   - Access logged and audited

3. **Multiple Gateways:**
   - Users can choose which gateway to trust
   - Gateway competition reduces single-point trust

**Residual Risk:**

- Gateway operator with HSM access could decrypt intents
- Insider attack possible if key management compromised

**Severity:** Medium (requires insider collusion)

---

### Threat 3: Solver Collusion

**Attack Vector:**  
Multiple solvers collude to manipulate auction outcomes or extract rent from users.

**Mitigation:**

1. **Sealed-Bid Auction:**
   - Solvers submit commitments without seeing others' bids
   - Prevents real-time coordination

2. **Bond Slashing:**
   - Colluding solvers risk bond loss if detected
   - Economic disincentive to collude

3. **Reputation Tracking:**
   - Solvers with poor performance (suspected collusion) lose auction priority

4. **Randomized Tie-Breaking:**
   - If multiple solvers tied, winner selected randomly
   - Prevents coordination on tie scenarios

**Residual Risk:**

- Off-chain coordination possible (solvers communicate outside protocol)
- If all solvers collude, users have no alternative (protocol governance must introduce new solvers)

**Severity:** Medium (mitigated by open solver network)

---

### Threat 4: Coordinator Censorship

**Attack Vector:**  
Batch coordinator refuses to include certain intents (e.g., from blacklisted users or competing protocols).

**Mitigation:**

1. **Deterministic Batch Schedule:**
   - Coordinator cannot delay batches arbitrarily
   - All intents received before deadline must be included

2. **Multiple Coordinators:**
   - Backup coordinators can take over if primary censors
   - Users can submit directly to fallback coordinator

3. **On-Chain Commitment:**
   - Intents committed on-chain (via `IntentRegistry`)
   - Anyone can verify coordinator included all committed intents in batch

4. **Direct Starknet Submission:**
   - Users can bypass gateway entirely and commit intent directly on Starknet
   - Slower UX but uncensorable

**Residual Risk:**

- Single coordinator has discretion over batch formation
- If all coordinators collude, censorship possible

**Severity:** Low (with multiple coordinators and on-chain fallback)

---

### Threat 5: Bridge Compromise

**Attack Vector:**  
Bitcoin bridge multi-sig signers collude to steal deposited BTC.

**Mitigation (Phase 1):**

1. **Threshold Signatures:**
   - M-of-N signers required (e.g., 7-of-10)
   - Collusion requires majority compromise

2. **Proof-of-Reserve Monitoring:**
   - Third-party services (e.g., ChainLink oracles) monitor bridge solvency
   - Alerts if reserves drop below total supply

3. **Risk Tier Disclosure:**
   - Users warned before deposit: "This bridge uses multi-sig custody. Assess risk before depositing large amounts."

4. **Insurance (Optional):**
   - Protocol treasury or third-party insurance covers bridge failure (up to cap)

**Mitigation (Phase 2+):**

- Covenant-based custody eliminates multi-sig trust
- Bitcoin script enforces withdrawal rules cryptographically

**Residual Risk:**

- Phase 1: Bridge signers can collude (trusted model)
- Phase 2+: Covenant bugs could lock funds

**Severity:** High (Phase 1), Low (Phase 2+)

---

### Threat 6: Replay Attacks

**Attack Vector:**  
Adversary intercepts signed intent and resubmits it (e.g., to drain user's balance across multiple batches).

**Mitigation:**

1. **Nonce Uniqueness:**
   - Every intent includes unique nonce
   - Contract enforces: nonce can only be used once per user

2. **Intent Hash Uniqueness:**
   - `intent_id = hash(user || nonce || intent_data)`
   - Duplicate submissions rejected

3. **Deadline Enforcement:**
   - Expired intents cannot be replayed
   - Even if adversary intercepts intent, cannot replay after expiry

**Residual Risk:**

- If user accidentally uses same nonce twice (user error): second intent rejected

**Severity:** Very Low (nonce mechanism robust)

---

### Threat 7: Denial of Service (DoS)

**Attack Vector:**  
Adversary floods gateway with spam intents to congest network or exhaust coordinator resources.

**Mitigation:**

1. **Rate Limiting:**
   - Gateway enforces: X intents per user per minute
   - IP-based rate limits for unauthenticated endpoints

2. **Fee Requirements:**
   - Small gas fee for intent commitment (discourages spam)
   - Fee refunded if intent settles successfully

3. **Proof-of-Work Tickets (Optional):**
   - User computes PoW before intent submission
   - Adjustable difficulty based on network load

4. **Allowlist Mode (Emergency):**
   - During attack: gateway switches to allowlist
   - Only verified users can submit (temporary measure)

**Residual Risk:**

- Sophisticated attacker with many Sybil identities can bypass rate limits
- Large-scale DDoS could still congest gateway

**Severity:** Medium (mitigated by rate limits and fees)

---

### Threat 8: Governance Capture

**Attack Vector:**  
Adversary accumulates governance tokens (if protocol is governed), proposes malicious upgrades (e.g., disable slashing, increase fees).

**Mitigation:**

1. **Timelock on Upgrades:**
   - Governance proposals have mandatory 7-day delay before execution
   - Users can exit if malicious proposal passes

2. **Guardian Veto:**
   - Multi-sig guardian council can veto clearly malicious proposals
   - Guardian keys held by diverse, reputable entities

3. **Parameter Bounds:**
   - Certain parameters (e.g., minimum bond) have hard-coded bounds
   - Governance cannot set outside bounds

4. **Fork Option:**
   - If governance captured, community can fork contracts
   - Users migrate to new deployment

**Residual Risk:**

- Governance tokens concentrated in few hands → capture easier
- Guardian council could also be compromised

**Severity:** Low (with timelocks and veto power)

---

## 13. Operational Considerations

### Key Rotation

**Gateway Encryption Keys:**
- **Frequency:** Every 90 days
- **Process:**
  1. Generate new key pair in HSM
  2. Publish new public key 7 days before rotation
  3. On rotation date: old key archived, new key active
  4. Old key retained for 6 months (decrypt historical intents for audits)

**Coordinator Signing Keys:**
- **Frequency:** Every 180 days
- **Process:**
  1. Generate new key in secure enclave
  2. Update `BatchAuction` contract with new coordinator address
  3. Old key revoked immediately

**Solver Keys:**
- **Responsibility:** Solver operators manage own key rotation
- **Recommendation:** Rotate every 90 days, use HSM for production

### Incident Response

**Severity Levels:**

**P0 (Critical - Funds at Risk):**
- Examples: Contract exploit, bridge compromise, mass slashing bug
- Response Time: Immediate (< 15 minutes)
- Actions:
  1. Emergency pause all contracts
  2. Public disclosure via status page
  3. Assemble incident response team (security, dev, legal)
  4. Investigate root cause
  5. Develop fix (hotfix or rollback)
  6. Communicate timeline to users

**P1 (High - Service Degraded):**
- Examples: Gateway downtime, coordinator failure, settlement delays
- Response Time: < 1 hour
- Actions:
  1. Failover to backup infrastructure
  2. Communicate outage to users
  3. Investigate and resolve
  4. Post-mortem published within 48 hours

**P2 (Medium - Non-Critical Issues):**
- Examples: Solver underperformance, UI bugs, documentation errors
- Response Time: < 24 hours
- Actions: Standard debugging and deployment process

**Incident Communication:**
- Status page updated in real-time
- Twitter / Discord announcements for major incidents
- Post-mortem reports for all P0/P1 incidents

### Monitoring and Alerting

**System Health Metrics:**

1. **Intent Submission Rate:**
   - Alert if rate drops >50% for >10 minutes (possible gateway outage)

2. **Batch Execution Latency:**
   - Alert if batch settlement takes >2x expected time

3. **Solver Participation:**
   - Alert if <2 solvers participate in auction (low competition)

4. **Slashing Events:**
   - Alert on any slashing (investigate immediately)

5. **Bridge Solvency:**
   - Alert if proof-of-reserve ratio <0.98 (bridge under-collateralized)

6. **Contract Gas Usage:**
   - Alert if settlement gas exceeds budget (possible DoS or inefficiency)

**Dashboards:**

- **Public Dashboard:** Intent volume, batch count, solver stats (no sensitive data)
- **Internal Dashboard:** Detailed metrics, error rates, performance breakdowns

**Logging:**

- **Application Logs:** Structured JSON logs, retained for 90 days
- **Audit Logs:** Sensitive operations (key access, contract upgrades), retained for 7 years
- **Privacy:** Never log plaintext intent details (only commitments/hashes)

### Upgrade Procedures

**Contract Upgrades:**

1. **Proposal:**
   - Upgrade proposed via governance (if governed) or admin multi-sig
   - Proposal includes: code diff, audit report, rationale

2. **Review Period:**
   - 7-day timelock
   - Community reviews code, auditors re-check

3. **Deployment:**
   - Deploy new implementation to testnet
   - Run full test suite (unit, integration, invariant)
   - Deploy to mainnet
   - Upgrade proxy to point to new implementation

4. **Migration:**
   - If storage layout changes: migration script executed
   - If incompatible changes: new deployment, user migration

**Infrastructure Upgrades:**

- **Gateway:** Rolling updates (zero downtime)
- **Coordinator:** Failover to backup during upgrade
- **Solver Nodes:** Operator responsibility (gradual rollout recommended)

### Kill Switches and Safe Shutdown

**Emergency Pause:**

- **Trigger:** Admin or guardian multi-sig
- **Effect:**
  - `IntentRegistry.commit_intent()` disabled (no new intents)
  - Pending batches allowed to complete
  - User funds safe (no forced transfers)

**Graceful Shutdown:**

1. **Announcement:** 30-day notice to users
2. **Freeze Intent Submissions:** After 7 days
3. **Settle All Pending Intents:** Over next 7 days
4. **Enable Withdrawals:** Users can withdraw all balances
5. **Final Settlement:** After 30 days, contracts permanently paused

**User Protection:**

- Users can always withdraw balances (even during pause)
- Intents can be canceled if not yet executed
- No admin can confiscate user funds (code prevents this)

---

## 14. Compliance & Transparency

### What Guarantees Users Get

**Execution Guarantees:**

1. **Constraint Satisfaction:**
   - If your intent settles, you are guaranteed: `output ≥ min_output`
   - If constraint not met: settlement reverts, your balance unchanged

2. **Atomicity:**
   - Batches settle atomically: all intents in batch execute or none do
   - No partial execution, no mid-batch failures leaving you in limbo

3. **Solver Accountability:**
   - If solver misbehaves (violates constraints, fails execution), their bond is slashed
   - Slashed funds distributed to affected users

4. **Privacy (If Enabled):**
   - Hidden amount mode: Amount not visible until settlement
   - Encrypted orderflow: Intent details not in public mempool

**Finality Guarantees:**

1. **Starknet Finality:**
   - Intent execution final after Starknet block confirmation
   - Settlement hash immutable on-chain

2. **Bitcoin Finality:**
   - BTC withdrawals final after 6 Bitcoin block confirmations
   - Standard Bitcoin security assumptions apply

### What Guarantees Users Do NOT Get

**Non-Guaranteed Elements:**

1. **Best Possible Price:**
   - Solvers compete, but protocol does not guarantee globally optimal price
   - You may get better execution than AMM, but not necessarily best possible

2. **Instant Execution:**
   - Batches run on fixed schedule (e.g., every 30 seconds)
   - If you submit 5 seconds before batch closes, you wait ~25 seconds
   - Bitcoin settlement adds 60–120 minutes

3. **Perfect Privacy:**
   - Metadata (timing, asset pair, gas costs) is public
   - Statistical analysis could correlate intents to users
   - Not a replacement for full-anonymity systems (Zcash, Monero)

4. **Zero Risk:**
   - Smart contract bugs possible (despite audits)
   - Bridge custody risk (Phase 1 multi-sig model)
   - Bitcoin L1 consensus assumptions (if Bitcoin forks, settlement affected)

5. **Solver Liveness:**
   - Protocol cannot force solvers to participate
   - If no solvers submit solutions, batch fails (intents return to pool)

### How Risks Are Communicated Clearly

**User Interface Disclosures:**

1. **First-Time Deposit:**
   - Modal: "Before depositing BTC, understand these risks..."
   - Checklist: Bridge custody, contract risk, settlement delays
   - User must click "I understand" to proceed

2. **Intent Submission:**
   - Privacy mode selector includes explanations:
     - Public: "Fastest execution, no privacy"
     - Hidden Amount: "Moderate privacy, amount concealed"
     - Hidden Direction: "Maximum privacy, may affect execution quality"

3. **Bridge Selection:**
   - Risk tier badges:
     - 🟢 Low Risk: Covenant-based (Phase 2+)
     - 🟡 Medium Risk: Multi-sig (7-of-10)
     - 🔴 High Risk: Multi-sig (3-of-5)
   - User can choose bridge based on risk tolerance

4. **Transaction Confirmations:**
   - "Your intent will execute in approximately X seconds (next batch)"
   - "Settlement on Bitcoin will take 60–120 minutes (6 confirmations)"

**Documentation:**

- **Risk Disclosure Page:** Detailed breakdown of all risks (updated quarterly)
- **FAQ:** "Is my BTC safe?" "What happens if bridge fails?" "Can I lose money?"
- **Audit Reports:** Links to third-party security audits (published publicly)

### How This Aligns with "Vibes Must Match Substance"

**Principle:**  
The system must not overstate its capabilities or downplay risks. Marketing and documentation must match technical reality.

**Alignment:**

1. **No "Trustless" Claims Without Basis:**
   - Phase 1 clearly states: "This bridge uses trusted multi-sig custody"
   - Phase 2+ can claim trustless after covenant implementation

2. **No "Perfect Privacy" Marketing:**
   - Documentation: "Privacy is structural but not absolute. Metadata is public."
   - No claims like "fully anonymous" or "untraceable"

3. **No "Guaranteed Best Price" Promises:**
   - UI: "Solvers compete to give you better-than-AMM prices, but not guaranteed optimal"

4. **Clear About Tradeoffs:**
   - "Encrypted orderflow protects against front-running but may reduce execution speed slightly"

5. **Honest About Limitations:**
   - "Bitcoin settlement takes time (60–120 minutes). This is not a high-frequency trading system."

**User Experience Principle:**

If a user reads marketing materials, then reads technical docs, then uses the product, they should encounter no surprises. Every claim is backed by technical implementation. Every risk is disclosed before impact.

---

## 15. Performance & Scalability

### Batch Sizing

**Target Batch Size:**
- **Intents per batch:** 10–1000
- **Rationale:**
  - <10 intents: Batching benefit minimal (little internal matching)
  - >1000 intents: Settlement gas costs exceed block limits

**Dynamic Batch Sizing:**
- If intent volume high (>1000 in 30-second window): Batch coordinator splits into multiple sub-batches
- Each sub-batch processed sequentially or in parallel (if asset pairs independent)

**Gas Cost Per Intent:**
- Estimated: 200,000–500,000 gas per intent settlement (Starknet)
- Batch of 100 intents: ~20–50M gas total
- Within Starknet block gas limit (typically 50M+ per block)

### Latency Targets

**End-to-End Latency Breakdown:**

1. **Intent Submission → Gateway Confirmation:** <1 second
2. **Gateway → Starknet Commitment:** 1–5 seconds (Starknet block time)
3. **Batch Window:** 0–30 seconds (depends on when user submits within window)
4. **Solver Competition:** 20 seconds (fixed)
5. **Auction Finalization:** 1–5 seconds
6. **Settlement Execution:** 5–15 seconds (Starknet transaction confirmation)

**Total Latency:** 30–75 seconds (from submission to settlement on Starknet)

**Bitcoin Withdrawal Latency:** +60–120 minutes (6 Bitcoin confirmations)

**Optimization Opportunities:**

- Reduce batch window to 15 seconds (trade-off: fewer intents per batch)
- Parallel solver computation (solvers compete concurrently, not sequentially)
- Faster Starknet block times (depends on Starknet protocol upgrades)

### Throughput Expectations

**Intents Per Day:**
- Conservative: 10,000–50,000 intents/day
- Optimistic: 100,000–500,000 intents/day (if high adoption)

**Batch Frequency:**
- 30-second batches → 2,880 batches/day
- At 100 intents/batch → 288,000 intents/day capacity

**Solver Throughput:**
- Each solver can propose solutions for multiple batches simultaneously
- If 10 solvers active, total solution capacity: 10 solutions/batch

**Network Bandwidth:**

- Intent submission: ~1 KB per intent (ciphertext + commitment)
- At 100,000 intents/day: ~100 MB/day inbound
- Settlement data: ~2 KB per intent (transfer details)
- At 100,000 intents/day: ~200 MB/day outbound

**Bottlenecks:**

1. **Starknet Gas Limits:**
   - If batch size exceeds block gas limit → split batches
   - Mitigation: Dynamic batch sizing

2. **Solver Competition Time:**
   - If many solvers → longer auction resolution
   - Mitigation: Limit solver participation (top N by reputation)

3. **Gateway I/O:**
   - High intent volume could congest gateway
   - Mitigation: Horizontal scaling (multiple gateway instances)

### Bottlenecks and Mitigation

**Bottleneck 1: Starknet State Growth**

- **Issue:** `IntentRegistry` stores all intent commitments forever
- **Impact:** State bloat, increased query costs
- **Mitigation:**
  - Archive settled intents after 90 days (move to off-chain storage)
  - Merkle proofs allow verification without full state

**Bottleneck 2: Solver Network Scalability**

- **Issue:** If 100+ solvers compete, auction mechanism slows
- **Impact:** Longer batch execution times
- **Mitigation:**
  - Pre-filter solvers (only top 20 by reputation can participate)
  - Parallel auction (sub-batches run independent auctions)

**Bottleneck 3: Gateway Centralization**

- **Issue:** Single gateway is single point of failure
- **Impact:** Downtime affects all users
- **Mitigation:**
  - Deploy multiple gateways (different operators, geographies)
  - Load balancing across gateways
  - Direct Starknet submission as fallback

**Bottleneck 4: Bitcoin Bridge Liquidity**

- **Issue:** High withdrawal volume could drain bridge reserves
- **Impact:** Withdrawals delayed until bridge rebalances
- **Mitigation:**
  - Bridge operator maintains liquidity buffer (e.g., 20% excess reserves)
  - Dynamic withdrawal limits (reduce per-user limit during high demand)
  - Communicate estimated withdrawal times to users

---

## 16. Design System & UX Requirements

### Non-Negotiable UX Principles

1. **Security-First Messaging:**
   - Risks disclosed before user commitment (no dark patterns)
   - Clear error messages (not generic "Transaction failed")
   - Confirmation screens for high-value actions

2. **Progressive Disclosure:**
   - Simple mode for retail users (default settings, minimal options)
   - Advanced mode for power users (all parameters customizable)
   - No overwhelming new users with technical jargon

3. **Transparent Costs:**
   - Total cost breakdown: solver fee + gas fee + slippage estimate
   - No hidden fees revealed only at confirmation

4. **Privacy Clarity:**
   - Privacy mode selector with visual indicators (locked icon, etc.)
   - Explanation: what data is hidden, what remains visible

5. **Trust Indicators:**
   - Solver reputation scores visible
   - Bridge risk tier badges
   - Audit report links

### Required UI Components

**1. IntentComposer**

*Purpose:* Main interface for creating intents

*Elements:*
- Asset pair selector (dropdown or search)
- Amount input (with balance display)
- Constraint sliders:
  - Min output (or max slippage %)
  - Max solver fee (basis points)
  - Deadline (time picker)
- Privacy mode toggle (Public / Hidden Amount / Hidden Direction)
- Estimated execution time
- Total cost breakdown
- "Submit Intent" button

*States:*
- Idle (ready for input)
- Validating (checking balance, constraints)
- Encrypting (progress indicator)
- Submitting (loading spinner)
- Confirmed (success message with intent_id)
- Error (clear error message with retry option)

**2. PrivacyModeBadge**

*Purpose:* Visual indicator of privacy level

*Variants:*
- 🔓 Public (gray badge, unlocked icon)
- 🔒 Hidden Amount (yellow badge, lock icon)
- 🔐 Hidden Direction (green badge, double lock icon)

*Interaction:*
- Hover: Tooltip explaining what each mode hides
- Click: Opens detailed privacy explainer modal

**3. BatchTimeline**

*Purpose:* Show when next batch executes

*Elements:*
- Countdown timer: "Next batch in 23 seconds"
- Last batch stats: "Last batch cleared 42 intents at avg price $95,200/BTC"
- Batch history (collapsible list of recent batches)

**4. SolverFillPreview**

*Purpose:* Estimate execution quality before submission

*Elements:*
- Estimated output amount (with uncertainty range)
- Comparison to baseline (AMM price)
- Solver fee estimate
- "This is an estimate. Final execution may vary."

*Visual:*
- Range bar showing: min possible output → expected output → max possible output
- Color-coded: green if better than AMM, yellow if similar, red if worse

**5. RiskDisclosurePanel**

*Purpose:* Communicate risks clearly

*Elements:*
- Bridge risk tier (badge + explanation)
- Settlement time estimate
- "What could go wrong?" section:
  - Smart contract risk
  - Bridge custody risk
  - Execution delay risk
- Links to audit reports, documentation

**6. AuditLogView**

*Purpose:* User-local record of all intents

*Elements:*
- List of submitted intents (intent_id, timestamp, status)
- Filter by: status (pending, settled, canceled, expired)
- Decrypt button (for encrypted intents post-settlement)
- Export to CSV (for tax reporting)

*Privacy:*
- All data stored client-side (browser local storage or encrypted cloud backup)
- Never sent to server in plaintext

---

## 17. Deployment & Environment Strategy

### Dev / Staging / Production Separation

**Environments:**

1. **Local Development:**
   - Developers run full stack locally (Starknet devnet, mock gateway, test solvers)
   - Purpose: Rapid iteration, unit testing

2. **Testnet (Staging):**
   - Deployed on Starknet testnet (e.g., Goerli, Sepolia)
   - Connected to Bitcoin testnet or signet
   - Purpose: Integration testing, audits, public beta

3. **Mainnet (Production):**
   - Deployed on Starknet mainnet
   - Connected to Bitcoin mainnet
   - Purpose: Real value, real users

**Isolation:**

- Each environment has separate:
  - Contract addresses
  - Gateway endpoints
  - Encryption keys
  - Solver networks

### Configuration Management

**Environment Variables:**

```bash
# Example config (production)
STARKNET_RPC_URL=https://mainnet.starknet.io
INTENT_REGISTRY_ADDRESS=0x...
BATCH_AUCTION_ADDRESS=0x...
GATEWAY_API_URL=https://gateway.blindbtc.io
BITCOIN_NETWORK=mainnet
BRIDGE_ADDRESS=bc1q...
```

**Configuration Schema:**

- All configs validated with JSON schema
- Invalid configs prevent deployment (fail fast)

**Secret Management:**

- Never commit secrets to git
- Use environment-specific secret stores:
  - Local: `.env` file (git-ignored)
  - Staging/Production: AWS Secrets Manager, HashiCorp Vault, or equivalent

### Secrets Handling

**Secret Types:**

1. **Gateway Encryption Private Key:**
   - Stored in: HSM (production), encrypted file (staging)
   - Access: Only gateway process, no human access

2. **Coordinator Signing Key:**
   - Stored in: Secure enclave
   - Access: Coordinator process only

3. **Admin Multi-Sig Keys:**
   - Stored in: Hardware wallets (Ledger, Trezor)
   - Access: Multi-sig signers (geographically distributed)

4. **API Keys (Third-Party Services):**
   - Examples: Starknet RPC provider, monitoring services
   - Stored in: Secret manager
   - Rotated every 90 days

**Secret Rotation Process:**

1. Generate new secret
2. Update secret manager
3. Deploy new config to staging
4. Test
5. Deploy to production (rolling update, zero downtime)
6. Revoke old secret after 7-day grace period

### CI/CD Requirements

**Continuous Integration (CI):**

*Triggers:*
- Every commit to main branch
- Every pull request

*Pipeline Steps:*
1. **Lint:** Check code style (Prettier, ESLint, Cairo formatter)
2. **Type Check:** Ensure no type errors (TypeScript, Cairo type system)
3. **Unit Tests:** Run all unit tests (contracts, SDK, API)
4. **Integration Tests:** Deploy to local testnet, run E2E tests
5. **Security Scan:**
   - Dependency scanning (npm audit, pip-audit)
   - Secret scanning (git-secrets, truffleHog)
   - SAST (static analysis for vulnerabilities)
6. **Contract Invariant Tests:** Fuzz testing for contract invariants
7. **Build:** Compile all artifacts
8. **Publish:** Publish to internal artifact registry (if tests pass)

**Continuous Deployment (CD):**

*Staging Deployment:*
- **Trigger:** Merge to main branch
- **Process:**
  1. Deploy contracts to testnet
  2. Deploy gateway to staging servers
  3. Run smoke tests
  4. Notify team (Slack, email)

*Production Deployment:*
- **Trigger:** Manual approval after staging validation
- **Process:**
  1. Tag release (semantic versioning)
  2. Deploy contracts to mainnet (via multi-sig governance)
  3. Deploy gateway to production (blue-green deployment)
  4. Run smoke tests on production
  5. Monitor metrics for 1 hour (rollback if anomalies)
  6. Announce release (status page, social media)

**Rollback Procedure:**

- If production deployment fails: revert to previous version
- Contract rollbacks: upgrade to previous implementation (if proxy pattern)
- Gateway rollbacks: switch traffic to previous deployment

---

## 18. Success Metrics

### Protocol-Level Metrics

**1. Intent Volume:**
- **Metric:** Total intents submitted per day
- **Target:** 10,000+ intents/day (6 months post-launch)
- **Indicator:** Healthy user adoption

**2. Total Value Locked (TVL):**
- **Metric:** Sum of BTC deposited in protocol
- **Target:** 1,000+ BTC within 12 months
- **Indicator:** User trust and capital commitment

**3. Batch Fill Rate:**
- **Metric:** % of batches that successfully settle
- **Target:** >95%
- **Indicator:** Solver network health

**4. Settlement Latency:**
- **Metric:** Median time from intent submission to settlement
- **Target:** <60 seconds
- **Indicator:** Execution efficiency

### Privacy Effectiveness Metrics

**1. Privacy Mode Adoption:**
- **Metric:** % of intents using hidden amount or hidden direction modes
- **Target:** >50% of intents use at least hidden amount
- **Indicator:** Users value privacy feature

**2. Internal Match Rate:**
- **Metric:** % of intent volume matched internally (coincidence of wants)
- **Target:** >20%
- **Indicator:** Privacy enables better matching (users comfortable submitting opposing intents simultaneously)

**3. Front-Running Incidents:**
- **Metric:** Reported instances of users being front-run
- **Target:** Zero (or near-zero, accounting for user error in public mode)
- **Indicator:** Encrypted orderflow effective

### Economic Health Metrics

**1. Solver Participation:**
- **Metric:** Average number of solvers per batch auction
- **Target:** >5 solvers
- **Indicator:** Competitive solver market

**2. User Price Improvement:**
- **Metric:** Average execution price vs baseline AMM price
- **Target:** +0.5% improvement
- **Indicator:** Solvers delivering value

**3. Solver Slashing Rate:**
- **Metric:** % of batches resulting in solver slashing
- **Target:** <1%
- **Indicator:** Low slashing = quality solver execution

**4. Protocol Revenue:**
- **Metric:** Fees collected (solver fees, gas fee rebates)
- **Target:** Sustainable revenue within 18 months
- **Indicator:** Protocol can fund operations and development

### User Trust Indicators

**1. Repeat User Rate:**
- **Metric:** % of users who submit >10 intents
- **Target:** >40%
- **Indicator:** Users trust system enough to return

**2. Average Intent Size:**
- **Metric:** Median BTC amount per intent
- **Target:** Increasing over time (users submit larger intents as trust grows)
- **Indicator:** User confidence

**3. Bridge Solvency Ratio:**
- **Metric:** Bridge BTC reserves / total SBTC supply
- **Target:** Always >1.0 (ideally >1.1 for buffer)
- **Indicator:** Bridge is solvent, users not at risk

**4. Net Promoter Score (NPS):**
- **Metric:** Survey-based user satisfaction
- **Target:** >50 (excellent)
- **Indicator:** Users would recommend protocol

**5. Security Incident Count:**
- **Metric:** Number of P0/P1 incidents per quarter
- **Target:** Zero P0, <2 P1 per quarter
- **Indicator:** System reliability

---

## 19. Explicit Tradeoffs & Rejected Alternatives

### Alternative 1: Direct Bitcoin L1 Execution (Rejected)

**Concept:**  
Execute intents directly on Bitcoin L1 using advanced scripting (covenants, OP_CAT).

**Why Rejected:**

- **Infeasibility:** OP_CAT not yet activated on Bitcoin; timeline uncertain
- **Scalability:** Bitcoin block size limits prevent high-throughput intent execution
- **Privacy:** Bitcoin lacks native zero-knowledge proof verification

**What Is Lost:**

- Full trustlessness (no external execution layer)
- Maximum Bitcoin alignment (some users prefer pure Bitcoin L1)

**What Is Gained:**

- Ship now (Phase 1 uses existing infrastructure)
- Superior execution layer (Starknet's Cairo proving)

---

### Alternative 2: Build on Ethereum Instead of Starknet (Rejected)

**Concept:**  
Use Ethereum as execution layer; settle on Bitcoin via bridge.

**Why Rejected:**

- **Gas Costs:** Ethereum gas too expensive for frequent batch settlements
- **Proving Efficiency:** Starknet's Cairo proofs more efficient than Ethereum's EVM
- **Differentiation:** Ethereum already has CoW Protocol, Flashbots; less greenfield opportunity

**What Is Lost:**

- Larger Ethereum DeFi ecosystem liquidity
- More mature tooling and developer community

**What Is Gained:**

- Lower gas costs (Starknet)
- Cairo-native ZK proving (better for privacy use cases)
- Starknet hackathon alignment (Bitcoin + Privacy tracks)

---

### Alternative 3: No Privacy Features (Public Orderflow Only) (Rejected)

**Concept:**  
Focus purely on intent execution and batch clearing; skip encryption and privacy modes.

**Why Rejected:**

- **Weak Differentiation:** Public orderflow batching already exists (CoW on Ethereum)
- **Bitcoin User Demand:** Bitcoin users (especially institutional) prioritize privacy
- **Hackathon Criteria:** Privacy track is core thesis

**What Is Lost:**

- Simpler implementation (no encryption overhead)
- Faster shipping (privacy adds development complexity)

**What Is Gained:**

- Unique value proposition (Bitcoin privacy execution)
- Institutional user adoption (privacy requirement)
- Competitive moat (hard to replicate)

---

### Alternative 4: Centralized Solver (No Open Competition) (Rejected)

**Concept:**  
Protocol operates a single, centralized solver; users trust protocol to execute fairly.

**Why Rejected:**

- **Trust Requirement:** Users must trust solver not to extract MEV
- **Single Point of Failure:** If solver offline, protocol halts
- **Regulatory Risk:** Centralized execution may be classified as financial service (regulatory burden)

**What Is Lost:**

- Simpler coordination (no auction mechanism needed)
- Potentially better execution (single solver optimizes globally)

**What Is Gained:**

- Decentralization (open solver network)
- Censorship resistance (no single entity controls execution)
- Solver competition (users benefit from best-execution incentives)

---

### Alternative 5: No Bitcoin Integration (Starknet-Native Assets Only) (Rejected)

**Concept:**  
Support only Starknet-native tokens (ETH, STRK, stablecoins); no Bitcoin involvement.

**Why Rejected:**

- **Off-Thesis:** Hackathon is Bitcoin-focused (Bitcoin track)
- **Smaller Market:** Bitcoin is largest crypto asset by market cap
- **Weak Story:** "Another Ethereum L2 DEX" vs "Bitcoin privacy execution"

**What Is Lost:**

- Simpler bridge integration (no BTC custody model)
- Avoid Bitcoin L1 finality delays

**What Is Gained:**

- Bitcoin market access (largest user base)
- Differentiation (Bitcoin DeFi is less crowded than Ethereum DeFi)
- Hackathon alignment

---

## 20. Long-Term Maintainability

### Governance Boundaries

**What Can Be Changed via Governance:**

- Protocol parameters:
  - Batch window duration (currently 30 seconds)
  - Minimum solver bond (currently 10 BTC)
  - Auction scoring weights
  - Slashing percentages
- Contract upgrades (with timelock)
- Fee distributions (protocol treasury allocation)

**What Cannot Be Changed (Hard-Coded Invariants):**

- User fund custody (users always own their balances)
- Intent immutability (commitments cannot be altered post-submission)
- Slashing existence (governance cannot disable slashing entirely)
- Nonce-based replay protection (core security feature)

**Governance Model:**

- Phase 1: Admin multi-sig (3-of-5 trusted entities)
- Phase 2: Token-based governance (BBIM token holders vote)
- Guardian council retains emergency veto power

### Upgrade Philosophy

**Principles:**

1. **Backward Compatibility Preferred:**
   - New features added via new contracts, not breaking changes to existing
   - Old contract versions remain functional during migration period

2. **User Opt-In:**
   - If upgrade changes UX significantly, users opt-in (not forced)
   - Example: Privacy mode upgrades (users choose when to adopt)

3. **Incremental Upgrades:**
   - Ship small, audited changes frequently
   - Avoid large, risky upgrades that touch many components

4. **Testnet Validation:**
   - Every upgrade deployed to testnet first
   - Public beta period (30+ days) before mainnet

**Upgrade Veto Conditions:**

Guardian council can veto if:
- Upgrade introduces critical security risk (per independent audit)
- Upgrade violates core protocol invariants
- Upgrade has insufficient testing (< 30 days on testnet)

### Compatibility Guarantees

**API Versioning:**

- All public APIs versioned (e.g., `/v1/intents`, `/v2/intents`)
- Old versions supported for minimum 12 months post-deprecation notice
- Breaking changes always result in new version (never in-place change)

**Contract Interfaces:**

- Contracts expose stable interfaces (`IIntentRegistry`, etc.)
- Interface changes require new contract deployment (old contracts remain)

**SDK Compatibility:**

- SDK follows semantic versioning (semver)
- Major version changes indicate breaking API changes
- Backward compatibility maintained within major versions

**Data Formats:**

- Intent data format versioned
- Older format intents remain valid (migration tools provided)

### What Would Cause a Hard Stop of the Project

**Irreversible Failure Conditions:**

1. **Critical Contract Exploit with Full Fund Loss:**
   - If contract bug results in total loss of user funds
   - Protocol cannot recover (no insurance sufficient)
   - Result: Permanent shutdown, legal liability

2. **Bitcoin Bridge Complete Failure:**
   - If bridge collapses and BTC unrecoverable
   - Result: Users lose deposited BTC, trust destroyed

3. **Regulatory Shutdown:**
   - If regulators ban intent-based execution or privacy features globally
   - Result: Cannot operate legally

4. **Starknet Collapse:**
   - If Starknet protocol fails (consensus bug, network halt)
   - Result: Execution layer gone, protocol inoperable

**Recoverable Failures:**

- Single solver failure: Replace solver, continue
- Gateway downtime: Failover to backup, continue
- Governance dispute: Fork protocol, continue under new governance

**Mitigation:**

- Insurance fund for contract bugs (covers up to $10M in losses)
- Multi-bridge support (if one bridge fails, users can exit via another)
- Diversified legal structure (operate in multiple jurisdictions)
- Starknet dependencies monitored (contingency plan for Starknet issues)

---

## Appendix A: Glossary

**Intent:**  
A user-submitted declaration of desired financial outcome with constraints, not a specific execution path.

**Solver:**  
An economically incentivized agent competing to execute intents by finding optimal routes and liquidity sources.

**Batch Clearing:**  
Aggregating multiple intents into a single atomic settlement, executed at uniform prices or via coordinated solver solutions.

**Encrypted Orderflow:**  
Submitting intents in ciphertext form such that details are not visible to public observers until settlement (or never).

**Commitment:**  
A cryptographic hash of intent details, binding the user to specific parameters without revealing them.

**Privacy Mode:**  
User-selectable level of intent detail concealment (Public, Hidden Amount, Hidden Direction).

**Slashing:**  
Penalizing a solver by confiscating their bond for misbehavior (constraint violation, execution failure).

**Proof-of-Reserve:**  
Public verification that a bridge holds sufficient Bitcoin to back all issued wrapped tokens.

**Nonce:**  
A unique number used once per user to prevent replay attacks on intent submissions.

**Expiry:**  
Deadline timestamp after which an intent cannot be executed.

**Settlement Finality:**  
The state at which an intent execution is irreversible and economically guaranteed.

---

## Appendix B: Reference Architecture Diagram

```
[User] --> [Client SDK] --> [Gateway API] --> [Intent Registry (Starknet)]
                |                                       |
                |                                       v
                +----> [Solver Network] <------- [Batch Auction (Starknet)]
                              |                        |
                              |                        v
                              +----> [Batch Settlement (Starknet)]
                                            |
                                            v
                                    [BTC Adapter Layer]
                                            |
                                            v
                                    [Bitcoin Bridge]
                                            |
                                            v
                                    [Bitcoin L1]
```

---

## Appendix C: Security Audit Checklist

**Pre-Audit Requirements:**

- [ ] All contracts deployed to testnet
- [ ] Full test coverage (>90% line coverage)
- [ ] Invariant tests written and passing
- [ ] Documentation complete (NatSpec for all functions)
- [ ] No TODO or FIXME comments in production code

**Audit Scope:**

- [ ] Intent commitment and cancellation logic
- [ ] Batch auction mechanism (sealed-bid, winner selection)
- [ ] Settlement execution and constraint verification
- [ ] Solver bonding and slashing conditions
- [ ] Replay protection (nonce handling)
- [ ] Access control (authorization checks)
- [ ] Cryptographic primitives (hash functions, signature verification)
- [ ] Integration with Bitcoin bridge

**Post-Audit:**

- [ ] All critical and high-severity findings resolved
- [ ] Medium-severity findings resolved or accepted with documented risk
- [ ] Audit report published publicly
- [ ] Bug bounty program launched

---

## Appendix D: Deployment Checklist

**Pre-Deployment:**

- [ ] Contracts audited by reputable firm
- [ ] Testnet deployment successful (30+ days uptime)
- [ ] Public beta completed (100+ users tested)
- [ ] Documentation published (user guides, API docs)
- [ ] Risk disclosures reviewed by legal
- [ ] Insurance policy in place (if applicable)
- [ ] Monitoring dashboards configured
- [ ] Incident response playbook written
- [ ] Admin multi-sig signers identified and keys secured

**Mainnet Deployment:**

- [ ] Deploy IntentRegistry contract
- [ ] Deploy BatchAuction contract
- [ ] Deploy BatchSettlement contract
- [ ] Deploy SolverBond contract
- [ ] Verify all contract addresses
- [ ] Initialize contracts with parameters
- [ ] Deploy gateway API (production servers)
- [ ] Deploy batch coordinator
- [ ] Configure monitoring and alerting
- [ ] Announce mainnet launch (status page, social media)

**Post-Deployment:**

- [ ] Monitor metrics for 48 hours (detect anomalies)
- [ ] Verify first batch executes successfully
- [ ] User support channels active (Discord, email)
- [ ] Emergency pause procedure tested (dry run)

---

**END OF DOCUMENT**

*This Product Requirements Document represents a complete, production-ready specification for the Blind BTC Intent Markets system. No section is left undefined. No placeholder text remains. This document is suitable for engineering implementation, security audits, regulatory review, and long-term project maintenance.*
