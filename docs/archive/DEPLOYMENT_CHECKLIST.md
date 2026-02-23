# Production Deployment Checklist

## ✅ Pre-Deployment Verification

### Smart Contracts

- [ ] All contracts compile without warnings: `scarb build`
- [ ] All contract tests pass: `scarb test`
- [ ] Contract addresses recorded in deployment_addresses.env
- [ ] Admin addresses configured correctly
- [ ] Treasury addresses configured correctly
- [ ] Coordinator address whitelisted

### Backend Services

#### Gateway API

- [ ] Builds successfully: `cd backend/gateway && cargo build --release`
- [ ] All tests pass: `cargo test`
- [ ] .env file configured with production values
- [ ] DATABASE_URL points to production PostgreSQL
- [ ] STARKNET_RPC_URL uses production endpoint
- [ ] Contract addresses match deployment_addresses.env
- [ ] Rate limits configured appropriately
- [ ] TLS/SSL certificates configured (if production)

#### Batch Coordinator

- [ ] Builds successfully: `cd backend/coordinator && cargo build --release`
- [ ] COORDINATOR_PRIVATE_KEY stored securely (HSM/Vault)
- [ ] Contract addresses configured
- [ ] Starknet account funded for gas

### Database

- [ ] PostgreSQL 15+ installed
- [ ] Database created
- [ ] Migrations run successfully
- [ ] Backup strategy configured
- [ ] Connection pooling configured
- [ ] Indexes created on frequently queried fields

### Security

- [ ] All private keys stored in secure vault (not .env files)
- [ ] Admin keys use multi-sig (recommended)
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] Signature verification tested

---

## 🚀 Deployment Steps

### 1. Deploy Contracts

```bash
cd scripts
cp .env.example .env
# Edit .env with production values
./deploy_contracts.sh
```

**Verify:**
- All 6 contracts deployed successfully
- Addresses saved to deployment_addresses.env
- Contracts callable on Starknet explorer

### 2. Initialize Contracts

```bash
# Whitelist assets in AssetRegistry
starkli invoke $ASSET_REGISTRY_ADDRESS whitelist_asset $SBTC_ADDRESS

# Register gateway in GatewayRegistry
starkli invoke $GATEWAY_REGISTRY_ADDRESS register_gateway $GATEWAY_PUBLIC_KEY

# Verify minimum bond in SolverBond
starkli call $SOLVER_BOND_ADDRESS get_minimum_bond
```

### 3. Setup Database

```bash
# Create production database
createdb blindmarkets_prod

# Run migrations
cd backend/gateway
export DATABASE_URL=postgresql://user:pass@host/blindmarkets_prod
cargo run --bin migrate

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

### 4. Deploy Gateway API

```bash
cd backend/gateway

# Build release binary
cargo build --release

# Copy binary to production server
scp target/release/blindmarkets-gateway user@server:/opt/blindmarkets/

# Create systemd service (Linux)
sudo cp gateway.service /etc/systemd/system/
sudo systemctl enable blindmarkets-gateway
sudo systemctl start blindmarkets-gateway

# Verify running
curl http://localhost:3000/health
```

### 5. Deploy Batch Coordinator

```bash
cd backend/coordinator

# Build release binary
cargo build --release

# Copy binary to production server
scp target/release/blindmarkets-coordinator user@server:/opt/blindmarkets/

# Create systemd service
sudo cp coordinator.service /etc/systemd/system/
sudo systemctl enable blindmarkets-coordinator
sudo systemctl start blindmarkets-coordinator

# Verify batches forming
journalctl -u blindmarkets-coordinator -f
```

### 6. Verify End-to-End

```bash
# Run E2E tests against production
export GATEWAY_URL=https://gateway.blindmarkets.io
./scripts/test_e2e.sh

# Submit test intent
curl -X POST $GATEWAY_URL/v1/intents \
  -H "Content-Type: application/json" \
  -d @test_intent.json

# Verify batch formation
# Check coordinator logs for batch creation

# Verify settlement
# Check Starknet explorer for settlement transactions
```

---

## 📊 Monitoring Setup

### Metrics to Monitor

**Gateway API:**
- Request rate (requests/second)
- Error rate (4xx, 5xx)
- Response time (p50, p95, p99)
- Database connection pool usage
- Rate limit hits

**Batch Coordinator:**
- Batch formation rate (batches/minute)
- Intent count per batch
- Settlement success rate
- Gas costs per batch
- Solver participation rate

**Contracts:**
- Intent submission rate
- Batch settlement rate
- Solver slashing events
- Bond amounts locked
- Total value locked (TVL)

### Alerting Rules

**Critical:**
- Gateway API down (no health check response)
- Coordinator not forming batches (>5 minutes)
- Database connection failures
- Contract pause triggered
- Solver bond slashing spike

**Warning:**
- High error rate (>5%)
- Slow response times (>1s p95)
- Low solver participation (<3 solvers/batch)
- Database disk space low (<20%)

---

## 🔒 Security Hardening

### Network Security

- [ ] Firewall configured (only necessary ports open)
- [ ] DDoS protection enabled
- [ ] TLS 1.3 for all HTTPS endpoints
- [ ] VPN for admin access

### Application Security

- [ ] Rate limiting enabled (per-user and per-IP)
- [ ] Input validation on all endpoints
- [ ] SQL parameterized queries only
- [ ] No secrets in logs
- [ ] Error messages don't leak internal details

### Key Management

- [ ] Private keys in HSM or secure vault
- [ ] Key rotation policy defined
- [ ] Multi-sig for admin functions
- [ ] Backup keys stored securely offline

### Monitoring

- [ ] Intrusion detection system (IDS)
- [ ] Log aggregation and analysis
- [ ] Anomaly detection for unusual patterns
- [ ] Security audit logs

---

## 🔄 Operational Procedures

### Backup and Recovery

**Database Backups:**
- Daily full backups
- Hourly incremental backups
- Test restore monthly
- Off-site backup storage

**Contract State:**
- Monitor contract events
- Archive historical data
- Snapshot state periodically

### Incident Response

**If Gateway API Down:**
1. Check health endpoint
2. Review logs for errors
3. Verify database connectivity
4. Restart service if needed
5. Notify users via status page

**If Coordinator Not Forming Batches:**
1. Check coordinator logs
2. Verify Starknet RPC connectivity
3. Check account gas balance
4. Verify contract addresses
5. Restart coordinator if needed

**If Contract Exploit Detected:**
1. Trigger emergency pause
2. Notify admin multi-sig
3. Assess damage
4. Prepare fix/upgrade
5. Communicate with users

### Upgrades

**Contract Upgrades:**
1. Deploy new implementation
2. Test on testnet
3. Audit new code
4. Prepare upgrade transaction
5. Execute via multi-sig
6. Verify upgrade successful

**Backend Upgrades:**
1. Test in staging environment
2. Create database migration (if needed)
3. Deploy to production (blue-green)
4. Monitor for errors
5. Rollback if issues detected

---

## ✅ Go-Live Checklist

### Final Verification

- [ ] All contracts deployed and verified
- [ ] All backend services running
- [ ] Database backups configured
- [ ] Monitoring and alerting active
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] User guides published
- [ ] Support channels ready
- [ ] Incident response plan documented
- [ ] Team trained on operations

### Communication

- [ ] Announce launch on social media
- [ ] Publish blog post with details
- [ ] Update website with contract addresses
- [ ] Notify early users
- [ ] Prepare FAQ for common questions

### Post-Launch

- [ ] Monitor metrics closely (first 24 hours)
- [ ] Be ready for rapid response
- [ ] Collect user feedback
- [ ] Track system performance
- [ ] Plan improvements based on usage

---

## 📞 Emergency Contacts

**On-Call Engineer:** [Contact Info]  
**Database Admin:** [Contact Info]  
**Security Team:** [Contact Info]  
**Starknet Support:** [Discord/Telegram]

---

## 📚 Additional Resources

- **Runbooks**: `/docs/runbooks/`
- **Architecture Diagrams**: `/docs/architecture/`
- **API Documentation**: `prd.md` Section 7
- **Threat Model**: `prd.md` Section 12

---

**Last Updated:** February 15, 2026  
**Version:** 1.0  
**Status:** Ready for Production Deployment
