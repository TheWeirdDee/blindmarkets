-- Add deterministic sequence for intent ordering
ALTER TABLE intents
    ADD COLUMN IF NOT EXISTS sequence BIGSERIAL;

-- Backfill existing rows if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'intents' AND column_name = 'sequence'
    ) THEN
        UPDATE intents
        SET sequence = nextval(pg_get_serial_sequence('intents', 'sequence'))
        WHERE sequence IS NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_intents_sequence ON intents(sequence);
