-- Add failure tracking for batches
ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(66),
    ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_batches_failed_at ON batches(failed_at);
