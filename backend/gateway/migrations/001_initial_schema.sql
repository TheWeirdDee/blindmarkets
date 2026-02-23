-- Initial schema for Blind BTC Intent Markets Gateway
-- Migration: 001_initial_schema
-- Created: 2026-02-13

-- Table: intents
-- Stores encrypted intent submissions
CREATE TABLE IF NOT EXISTS intents (
    intent_id VARCHAR(66) PRIMARY KEY NOT NULL,
    user_address VARCHAR(66) NOT NULL,
    asset_in VARCHAR(66),
    asset_out VARCHAR(66),
    amount NUMERIC(78, 0),
    min_output NUMERIC(78, 0),
    max_fee_bps INTEGER,
    privacy_mode SMALLINT,
    nonce VARCHAR(66),
    ciphertext TEXT NOT NULL,
    encrypted_session_key TEXT,
    commitment VARCHAR(66) NOT NULL,
    client_public_key VARCHAR(130) NOT NULL,
    batch_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deadline BIGINT NOT NULL
);

-- Table: batches
-- Stores batch metadata
CREATE TABLE IF NOT EXISTS batches (
    batch_id VARCHAR(50) PRIMARY KEY NOT NULL,
    close_time BIGINT NOT NULL,
    intent_count INTEGER NOT NULL DEFAULT 0,
    auction_deadline BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'FORMING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP
);

-- Table: user_nonces
-- Tracks used nonces for replay protection
CREATE TABLE IF NOT EXISTS user_nonces (
    user_address VARCHAR(66) NOT NULL,
    nonce VARCHAR(66) NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_address, nonce)
);

-- Table: rate_limits
-- Tracks rate limiting per user and IP
CREATE TABLE IF NOT EXISTS rate_limits (
    identifier VARCHAR(128) NOT NULL,
    limit_type VARCHAR(20) NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (identifier, limit_type)
);

-- Table: pending_balances
-- Tracks pending intent commitments for double-spend prevention
CREATE TABLE IF NOT EXISTS pending_balances (
    user_address VARCHAR(66) NOT NULL,
    asset_address VARCHAR(66) NOT NULL,
    pending_amount NUMERIC(78, 0) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_address, asset_address)
);

CREATE INDEX IF NOT EXISTS idx_intents_user_address ON intents(user_address);
CREATE INDEX IF NOT EXISTS idx_intents_batch_id ON intents(batch_id);
CREATE INDEX IF NOT EXISTS idx_intents_status ON intents(status);
CREATE INDEX IF NOT EXISTS idx_intents_created_at ON intents(created_at);
CREATE INDEX IF NOT EXISTS idx_intents_deadline ON intents(deadline);

CREATE INDEX IF NOT EXISTS idx_batches_close_time ON batches(close_time);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);

CREATE INDEX IF NOT EXISTS idx_user_nonces_used_at ON user_nonces(used_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start ON rate_limits(window_start);

-- Trigger: Update updated_at on intents
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_intents_updated_at BEFORE UPDATE ON intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_balances_updated_at BEFORE UPDATE ON pending_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup function for old rate_limits (called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits WHERE window_start < CURRENT_TIMESTAMP - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Cleanup function for old nonces (called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_nonces()
RETURNS void AS $$
BEGIN
    DELETE FROM user_nonces WHERE used_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;
