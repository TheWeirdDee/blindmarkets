-- Store amount commitment explicitly for auditability
ALTER TABLE intents
    ADD COLUMN IF NOT EXISTS amount_commitment VARCHAR(66);

CREATE INDEX IF NOT EXISTS idx_intents_amount_commitment ON intents(amount_commitment);
