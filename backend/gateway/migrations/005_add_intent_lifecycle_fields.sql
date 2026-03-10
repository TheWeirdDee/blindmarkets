ALTER TABLE intents
ADD COLUMN IF NOT EXISTS submission_mode VARCHAR(20) NOT NULL DEFAULT 'GATEWAY',
ADD COLUMN IF NOT EXISTS onchain_tx_hash VARCHAR(66),
ADD COLUMN IF NOT EXISTS onchain_committed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_intents_submission_mode ON intents(submission_mode);
CREATE INDEX IF NOT EXISTS idx_intents_onchain_tx_hash ON intents(onchain_tx_hash);
